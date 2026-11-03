-- =============================================================================
-- Epic E06 — Avaliações verificadas
--
-- A trava estrutural (booking_id NOT NULL + UNIQUE + on delete restrict) e a
-- RLS que só deixa o cliente avaliar depois de concluído (pode_avaliar) já
-- existiam desde a T00.2/T00.4 (ver supabase/migrations/20260901120200_* e
-- 20260911100000_rls.sql) — essa é a T06.1, e o teste que prova que ela
-- funciona está em docs/avaliacoes-teste-rls.md.
--
-- O que faltava, e que esta migration entrega:
--   T06.3 — estatísticas (média + total) e lista paginada de avaliações
--   T06.4 — lembrete de avaliação (um só, não insiste)
--   T06.5 — denúncia de avaliação (marcar para moderação)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- T06.5 — Denúncia de avaliação
-- -----------------------------------------------------------------------------
--
-- Não existe policy de UPDATE em reviews liberada pro usuário comum (só
-- "admin modera avaliacoes") — de propósito, pra ninguém editar nota ou
-- comentário depois de publicado. Esta RPC é a única porta de escrita que
-- um usuário comum tem sobre reviews, e só mexe em `denunciada`. A "fila do
-- admin" citada na task é a própria coluna: quem vai consumi-la (listar,
-- ocultar, suspender) é a T09.3, ainda não implementada.

create or replace function public.denunciar_avaliacao(p_review_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.reviews
  set denunciada = true
  where id = p_review_id
  returning true;
$$;

comment on function public.denunciar_avaliacao is
  'T06.5: marca uma avaliação para moderação. Única porta de escrita de '
  'usuário comum sobre reviews — só altera denunciada, nunca nota/comentário. '
  'Idempotente: denunciar de novo não faz diferença.';

grant execute on function public.denunciar_avaliacao(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- T06.4 — Lembrete de avaliação (após conclusão, um lembrete só)
-- -----------------------------------------------------------------------------
--
-- Mesmo padrão da T08.5 (messages.lembrete_enviado_em): não é trigger,
-- porque não é "algo aconteceu agora", é "passou um tempo sem a pessoa
-- fazer nada" — uma função que o pg_cron chama de hora em hora, com uma
-- coluna de dedup pra nunca mandar duas vezes.

alter table public.bookings add column lembrete_avaliacao_enviado_em timestamptz;

comment on column public.bookings.lembrete_avaliacao_enviado_em is
  'T06.4: marca que já saiu o lembrete de avaliação pra esta contratação — '
  'evita reenviar a cada execução do cron. Mesmo padrão de '
  'messages.lembrete_enviado_em (T08.5).';

create or replace function public.enfileirar_lembretes_avaliacao(p_horas_apos_conclusao int default 24)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantidade int := 0;
  r record;
begin
  -- Só pro cliente (só ele pode avaliar — pode_avaliar) e só se ainda não
  -- existe avaliação pra esta contratação (sem sentido lembrar quem já
  -- avaliou). "Um lembrete só" é o filtro lembrete_avaliacao_enviado_em is
  -- null, marcado logo depois de enfileirar.
  for r in
    select b.id, c.client_id
    from public.bookings b
    join public.conversations c on c.id = b.conversation_id
    where b.status = 'concluido'
      and b.lembrete_avaliacao_enviado_em is null
      and b.concluido_em <= now() - make_interval(hours => p_horas_apos_conclusao)
      and not exists (select 1 from public.reviews rv where rv.booking_id = b.id)
  loop
    perform public.enfileirar_evento_notificacao(
      r.client_id, 'avaliacao_pendente', jsonb_build_object('booking_id', r.id)
    );
    update public.bookings set lembrete_avaliacao_enviado_em = now() where id = r.id;
    v_quantidade := v_quantidade + 1;
  end loop;
  return v_quantidade;
end;
$$;

comment on function public.enfileirar_lembretes_avaliacao is
  'T06.4. Chamada pelo pg_cron de hora em hora (ver fim desta migration). '
  'Só pro cliente, só se ainda não avaliou, e só uma vez por contratação.';

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'lembrete-avaliacao-pendente',
  '0 * * * *',
  $$select public.enfileirar_lembretes_avaliacao(24);$$
);

-- -----------------------------------------------------------------------------
-- T06.3 — Estatísticas (média + total) e lista paginada de avaliações
-- -----------------------------------------------------------------------------
--
-- Não dá pra ser uma VIEW simples: RLS de bookings/conversations só deixa
-- os dois participantes verem a linha, e quem vai consultar isto é
-- qualquer visitante anônimo olhando um perfil ou a busca. Por isso
-- SECURITY DEFINER, igual buscar_profissionais e pode_avaliar — lê
-- bookings/conversations com o privilégio de quem criou a função, e só
-- devolve o agregado (média, total) ou os campos já públicos da review.

create or replace function public.estatisticas_avaliacoes(p_worker_profile_id uuid)
returns table (nota_media numeric, total_avaliacoes int)
language sql
stable
security definer
set search_path = ''
as $$
  select avg(rv.nota)::numeric(10,2), count(*)::int
  from public.reviews rv
  join public.bookings b on b.id = rv.booking_id
  join public.conversations c on c.id = b.conversation_id
  where c.worker_profile_id = p_worker_profile_id;
$$;

comment on function public.estatisticas_avaliacoes is
  'T06.3: média e total de avaliações de um profissional, pro perfil e pra '
  'busca. nota_media vem null quando total_avaliacoes é 0 (média de '
  'conjunto vazio) — a UI trata isso como "sem avaliações ainda", nunca '
  'como nota zero.';

grant execute on function public.estatisticas_avaliacoes(uuid) to anon, authenticated;

create or replace function public.listar_avaliacoes_profissional(
  p_worker_profile_id uuid,
  p_limite int default 10,
  p_offset int default 0
)
returns table (
  id uuid,
  nota int,
  comentario text,
  created_at timestamptz,
  autor_nome text
)
language sql
stable
security definer
set search_path = ''
as $$
  select rv.id, rv.nota, rv.comentario, rv.created_at, p.nome
  from public.reviews rv
  join public.bookings b on b.id = rv.booking_id
  join public.conversations c on c.id = b.conversation_id
  join public.profiles p on p.id = rv.autor_id
  where c.worker_profile_id = p_worker_profile_id
  order by rv.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$$;

comment on function public.listar_avaliacoes_profissional is
  'T06.3: lista paginada de avaliações de um profissional, mais recente '
  'primeiro, com o nome de quem avaliou (nenhuma avaliação fixa no código '
  '— é sempre isto que a tela de perfil e a busca consultam).';

grant execute on function public.listar_avaliacoes_profissional(uuid, int, int) to anon, authenticated;

-- buscar_profissionais (T03.1, E03) ganha nota_media/total_avaliacoes — é
-- onde a busca mostra a reputação sem round-trip extra por resultado.
-- CREATE OR REPLACE não permite mudar as colunas de retorno: precisa
-- dropar e recriar com a assinatura de entrada igual.

drop function if exists public.buscar_profissionais(
  double precision, double precision, text, numeric, int, int
);

create function public.buscar_profissionais(
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
  distancia_km        numeric,
  nota_media          numeric,
  total_avaliacoes    int
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
    ) as distancia_km,
    rs.nota_media,
    coalesce(rs.total_avaliacoes, 0) as total_avaliacoes
  from public.worker_profiles w
  join public.profiles p on p.id = w.profile_id
  left join lateral (
    select avg(rv.nota)::numeric(10,2) as nota_media, count(*)::int as total_avaliacoes
    from public.reviews rv
    join public.bookings b on b.id = rv.booking_id
    join public.conversations c on c.id = b.conversation_id
    where c.worker_profile_id = w.id
  ) rs on true
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
  'devolve distancia_km. Nunca retorna a coordenada. nota_media/'
  'total_avaliacoes acrescentados na E06 (T06.3).';

revoke all on function public.buscar_profissionais(
  double precision, double precision, text, numeric, int, int
) from public;
grant execute on function public.buscar_profissionais(
  double precision, double precision, text, numeric, int, int
) to anon, authenticated;
