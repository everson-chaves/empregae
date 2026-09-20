-- =============================================================================
-- E03 — Busca geográfica (T03.1 RPC de busca, T03.6 telemetria)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- T03.1 — RPC de busca
-- -----------------------------------------------------------------------------
--
-- O raio que importa aqui é o do PROFISSIONAL (worker_profiles.raio_atendimento_km):
-- quem atende é quem se desloca, então um resultado só é válido se a distância
-- até o cliente couber no raio que o próprio profissional declarou (T02.5).
-- `p_raio_maximo_km` é um filtro OPCIONAL adicional, do lado do cliente ("só
-- me mostra gente a até X km"), não substitui o raio do profissional.
--
-- SECURITY DEFINER é o motivo desta função poder ler `worker_profiles.location`
-- mesmo com o SELECT da coluna revogado de anon/authenticated (RLS, T00.4):
-- ela roda com o privilégio de quem a criou, e só devolve `distancia_km` já
-- calculada — a coordenada em si nunca sai daqui. `set search_path` fixo
-- evita sequestro de search_path num SECURITY DEFINER (boa prática do
-- próprio Postgres, mesmo padrão das outras funções da T00.4).
create or replace function public.buscar_profissionais(
  p_lat double precision,
  p_lon double precision,
  p_categoria_slug text default null,
  p_raio_maximo_km numeric default null,
  p_limite int default 20,
  p_offset int default 0
)
returns table (
  worker_profile_id   uuid,
  profile_id          uuid,
  nome                text,
  avatar_url          text,
  descricao           text,
  preco_medio_centavos int,
  unidade_preco       unidade_preco,
  raio_atendimento_km int,
  bairro              text,
  cidade              text,
  uf                  text,
  verificado_ate      date,
  categorias          text[],
  distancia_km        numeric
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    w.id,
    w.profile_id,
    p.nome,
    p.avatar_url,
    w.descricao,
    w.preco_medio_centavos,
    w.unidade_preco,
    w.raio_atendimento_km,
    w.bairro,
    w.cidade,
    w.uf,
    w.verificado_ate,
    coalesce(
      (select array_agg(c2.nome order by c2.ordem)
       from public.worker_categories wc2
       join public.categories c2 on c2.id = wc2.category_id
       where wc2.worker_profile_id = w.id),
      '{}'
    ) as categorias,
    round(
      (ST_Distance(w.location, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography) / 1000.0)::numeric,
      1
    ) as distancia_km
  from public.worker_profiles w
  join public.profiles p on p.id = w.profile_id
  where w.ativo
    and w.location is not null
    and ST_DWithin(
      w.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      w.raio_atendimento_km * 1000
    )
    and (
      p_raio_maximo_km is null
      or ST_DWithin(
        w.location,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        p_raio_maximo_km * 1000
      )
    )
    and (
      p_categoria_slug is null
      or exists (
        select 1
        from public.worker_categories wc
        join public.categories c on c.id = wc.category_id
        where wc.worker_profile_id = w.id and c.slug = p_categoria_slug
      )
    )
  order by distancia_km asc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$$;

comment on function public.buscar_profissionais is
  'Busca por raio (T03.1). SECURITY DEFINER: lê location internamente, só '
  'devolve distancia_km. Nunca retorna a coordenada.';

revoke all on function public.buscar_profissionais(
  double precision, double precision, text, numeric, int, int
) from public;
grant execute on function public.buscar_profissionais(
  double precision, double precision, text, numeric, int, int
) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- T03.6 — Telemetria de busca
-- -----------------------------------------------------------------------------
--
-- Alimenta a métrica de liquidez do piloto (% de buscas com 5+ resultados).
-- `numero_resultados` vem do cliente, não recalculado aqui — para telemetria
-- interna de uso, o custo de uma segunda RPC só para validar esse número não
-- se paga; o pior caso é um dado de analytics levemente impreciso, não uma
-- falha de segurança (a tabela não informa nada sobre quem viu o quê).
create table public.search_logs (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid references auth.users (id) on delete set null,

  lat               double precision not null,
  lon               double precision not null,
  raio_maximo_km    numeric,
  categoria_slug    text,
  numero_resultados int not null check (numero_resultados >= 0),

  criado_em         timestamptz not null default now()
);

comment on table public.search_logs is
  'Uma linha por busca executada (T03.6). Alimenta a métrica de liquidez '
  '(% de buscas com 5+ resultados). usuario_id nulo = busca anônima.';

alter table public.search_logs enable row level security;

create policy "qualquer um registra a propria busca"
  on public.search_logs for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = auth.uid());

create policy "so admin le a telemetria de busca"
  on public.search_logs for select to authenticated
  using (public.eh_admin());

-- -----------------------------------------------------------------------------
-- T03.5 — Estado vazio: captura de e-mail para avisar quando houver oferta
-- -----------------------------------------------------------------------------
create table public.busca_avisos (
  id             uuid primary key default gen_random_uuid(),
  email          text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  categoria_slug text,
  lat            double precision not null,
  lon            double precision not null,
  criado_em      timestamptz not null default now()
);

comment on table public.busca_avisos is
  'Pedido de aviso quando uma busca não teve resultado (T03.5). Consulta '
  'manual do admin pra priorizar onde recrutar profissionais novos — não '
  'dispara nada sozinho no MVP1.';

alter table public.busca_avisos enable row level security;

create policy "qualquer um pode pedir aviso"
  on public.busca_avisos for insert to anon, authenticated with check (true);

create policy "so admin le os avisos pedidos"
  on public.busca_avisos for select to authenticated
  using (public.eh_admin());
