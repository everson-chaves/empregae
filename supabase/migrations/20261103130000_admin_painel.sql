-- =============================================================================
-- Epic E09 — Painel admin
--
-- T09.1 (papel de admin, RLS, função eh_admin) já existe desde a T00.4
-- (supabase/migrations/20260911100000_rls.sql) — a tabela `admins` e a
-- função eh_admin() são exatamente a estrutura que esta task pedia. O que
-- faltava era a aplicação usar isso (Admin.tsx chama a RPC eh_admin para
-- decidir se deixa a pessoa entrar) e o teste que prova que um usuário comum
-- NÃO entra — docs/admin-teste-rls.md.
--
-- O resto desta migration cobre o que de fato faltava:
--   T09.2 — ver o documento de verificação (column-revoke esconde até de
--           admin), e sincronizar o selo quando aprova
--   T09.3 — suspender perfil, ocultar avaliação denunciada
--   T09.4 — métricas do piloto (uma função só, seis números)
--   T09.5 — não precisa de nada aqui: o CSV é montado no cliente a partir
--           do resultado de admin_metricas_piloto()
--
-- As três listagens (fila de verificação, denúncias de profissional,
-- avaliações denunciadas) viram funções SECURITY DEFINER com o nome já
-- resolvido, mesmo padrão de listar_avaliacoes_profissional (E06) — a
-- alternativa seria um select aninhado de 3-4 tabelas no cliente (RLS já
-- deixaria o admin ler tudo), mas este ambiente não tem Supabase local
-- (Docker) para testar esse embed na prática. Uma junção em SQL, revisável
-- linha a linha, é a escolha mais segura sem esse ambiente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- T09.2 — Ver o documento de verificação
-- -----------------------------------------------------------------------------
-- `verifications.documento_url` teve o SELECT revogado de TODO authenticated
-- na T00.4 ("some para todo mundo, inclusive para quem enviou") — GRANT de
-- coluna é por ROLE do Postgres, não por linha, e admin não é um role
-- separado: é só um authenticated com uma linha em `admins`. RLS não
-- resolve isso (RLS decide linha, não coluna) — só uma função SECURITY
-- DEFINER devolve esta coluna, e só para quem eh_admin(). O admin usa o
-- CAMINHO devolvido para gerar a signed URL no cliente
-- (supabase.storage.from('verificacoes').createSignedUrl) — essa segunda
-- chamada passa pela RLS de storage.objects, que já libera admin (T07.1).

create or replace function public.admin_caminho_documento_verificacao(p_verification_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caminho text;
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores podem ver documentos de verificação.';
  end if;

  select documento_url into v_caminho
  from public.verifications
  where id = p_verification_id;

  return v_caminho;
end;
$$;

comment on function public.admin_caminho_documento_verificacao is
  'T09.2: devolve o caminho do documento (não o arquivo) para o admin gerar '
  'a signed URL no cliente. SECURITY DEFINER porque documento_url tem SELECT '
  'revogado de TODO authenticated (T00.4) — GRANT de coluna não distingue '
  'admin de usuário comum, só RLS distingue, e RLS não é por coluna.';

grant execute on function public.admin_caminho_documento_verificacao(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- T09.2 — Fila de verificação (listagem)
-- -----------------------------------------------------------------------------

create or replace function public.admin_fila_verificacao()
returns table (
  id uuid,
  worker_profile_id uuid,
  nome_profissional text,
  status status_verificacao,
  tipo_documento text,
  observacao text,
  validade date,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores veem a fila de verificação.';
  end if;

  return query
  select v.id, v.worker_profile_id, p.nome, v.status, v.tipo_documento, v.observacao, v.validade, v.created_at
  from public.verifications v
  join public.worker_profiles w on w.id = v.worker_profile_id
  join public.profiles p on p.id = w.profile_id
  order by v.created_at asc;
end;
$$;

comment on function public.admin_fila_verificacao is
  'T09.2: fila de verificação com o nome do profissional já resolvido. '
  'SECURITY DEFINER + checagem eh_admin() interna — a função não tem RLS, '
  'quem autoriza é a checagem no corpo, não GRANT.';

grant execute on function public.admin_fila_verificacao() to authenticated;

-- -----------------------------------------------------------------------------
-- T09.2 — Aprovar/reprovar sincroniza o selo
-- -----------------------------------------------------------------------------
-- O admin só precisa de UPDATE em `verifications` (RLS "admin decide a
-- verificacao" já cobre, T00.4) — a aplicação NÃO chama RPC para
-- aprovar/reprovar, só para ver o documento e listar a fila. Mas aprovar
-- sem propagar a validade para worker_profiles.verificado_ate deixaria o
-- selo (T07.3) sem aparecer nunca — T07.3 lê verificado_ate, não o status
-- de verifications. Mesmo padrão do trigger de notificação
-- (verifications_notificar_evento, T08.3): dispara na mudança de status, a
-- aplicação não decide replicar o dado.

create or replace function public.sincronizar_selo_verificacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'aprovado' and old.status is distinct from new.status then
    update public.worker_profiles set verificado_ate = new.validade where id = new.worker_profile_id;
  end if;
  return new;
end;
$$;

comment on function public.sincronizar_selo_verificacao is
  'T09.2: ao aprovar uma verificação, propaga a validade para '
  'worker_profiles.verificado_ate — é essa coluna que T07.3 lê para exibir '
  'o selo, nunca o status de verifications diretamente.';

create trigger verifications_sincronizar_selo
  after update of status on public.verifications
  for each row execute function public.sincronizar_selo_verificacao();

-- -----------------------------------------------------------------------------
-- T09.3 — Moderação: suspender ou reativar perfil
-- -----------------------------------------------------------------------------
-- "anuncio ativo e publico" (select) e "profissional gerencia o proprio
-- anuncio" (all, T00.4) não dão caminho nenhum de admin — sem isto o admin
-- nem VÊ um anúncio já suspenso (não é dono, e ativo=false some da policy
-- pública) nem consegue mudar `ativo`. Duas policies novas, aditivas às que
-- já existem (RLS combina policies permissivas com OR) — não se edita
-- migration antiga neste projeto.

create policy "admin ve qualquer anuncio"
  on public.worker_profiles for select to authenticated
  using (public.eh_admin());

create policy "admin suspende ou reativa perfil"
  on public.worker_profiles for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- -----------------------------------------------------------------------------
-- T09.3 — Moderação: denúncias de profissional (listagem)
-- -----------------------------------------------------------------------------

create or replace function public.admin_denuncias_profissionais()
returns table (
  id uuid,
  worker_profile_id uuid,
  nome_profissional text,
  motivo text,
  resolvida boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores veem denúncias.';
  end if;

  return query
  select r.id, r.worker_profile_id, p.nome, r.motivo, r.resolvida, r.created_at
  from public.worker_reports r
  join public.worker_profiles w on w.id = r.worker_profile_id
  join public.profiles p on p.id = w.profile_id
  order by r.resolvida asc, r.created_at asc;
end;
$$;

comment on function public.admin_denuncias_profissionais is
  'T09.3: denúncias de profissional (T07.6) com o nome já resolvido. Mesmo '
  'motivo de admin_fila_verificacao: junção revisável em SQL, sem depender '
  'de embed aninhado do PostgREST que não dá para testar neste ambiente.';

grant execute on function public.admin_denuncias_profissionais() to authenticated;

-- -----------------------------------------------------------------------------
-- T09.3 — Moderação: ocultar avaliação denunciada
-- -----------------------------------------------------------------------------
-- denunciada=true (T06.5) só marca para esta fila — quem decide ocultar é
-- aqui. "admin modera avaliacoes" (update, T00.4) já libera a escrita; só
-- faltava a coluna e as leituras públicas (E06) respeitarem ela — senão
-- "ocultar" moderaria a fila mas a avaliação continuaria pública e entrando
-- na média, o oposto do que T09.3 pede.

alter table public.reviews add column oculta boolean not null default false;

comment on column public.reviews.oculta is
  'T09.3: avaliação ocultada pelo admin após denúncia (T06.5). Ao contrário '
  'de denunciada, esta SIM some da exibição pública e da média — quem '
  'decide isto é sempre o admin, nunca automático.';

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
  where c.worker_profile_id = p_worker_profile_id
    and not rv.oculta;
$$;

comment on function public.estatisticas_avaliacoes is
  'T06.3: média e total de avaliações de um profissional, pro perfil e pra '
  'busca. nota_media vem null quando total_avaliacoes é 0. Atualizada na '
  'T09.3 pra nunca contar avaliação oculta pelo admin.';

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
    and not rv.oculta
  order by rv.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$$;

comment on function public.listar_avaliacoes_profissional is
  'T06.3: lista paginada de avaliações de um profissional, mais recente '
  'primeiro. Atualizada na T09.3 pra nunca listar avaliação oculta pelo '
  'admin (denunciada=true sozinho não oculta nada).';

-- buscar_profissionais: a média exibida na busca também não pode contar
-- avaliação oculta. Mesma assinatura da E06 — CREATE OR REPLACE basta.

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
      and not rv.oculta
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
  'devolve distancia_km. nota_media/total_avaliacoes (E06) nunca contam '
  'avaliação oculta pelo admin (T09.3).';

-- -----------------------------------------------------------------------------
-- T09.3 — Moderação: avaliações denunciadas (listagem)
-- -----------------------------------------------------------------------------

create or replace function public.admin_avaliacoes_denunciadas()
returns table (
  id uuid,
  nota int,
  comentario text,
  oculta boolean,
  created_at timestamptz,
  nome_autor text,
  nome_profissional text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores veem avaliações denunciadas.';
  end if;

  return query
  select rv.id, rv.nota, rv.comentario, rv.oculta, rv.created_at, autor.nome, prof.nome
  from public.reviews rv
  join public.profiles autor on autor.id = rv.autor_id
  join public.bookings b on b.id = rv.booking_id
  join public.conversations c on c.id = b.conversation_id
  join public.worker_profiles w on w.id = c.worker_profile_id
  join public.profiles prof on prof.id = w.profile_id
  where rv.denunciada
  order by rv.created_at asc;
end;
$$;

comment on function public.admin_avaliacoes_denunciadas is
  'T09.3: avaliações denunciadas (T06.5), com quem avaliou e quem foi '
  'avaliado já resolvidos. oculta=true no retorno é o estado atual — quem '
  'muda isto é um update direto em reviews.oculta (RLS "admin modera '
  'avaliacoes" já libera), não uma RPC própria.';

grant execute on function public.admin_avaliacoes_denunciadas() to authenticated;

-- -----------------------------------------------------------------------------
-- T09.4 — Dashboard de métricas do piloto
-- -----------------------------------------------------------------------------
-- As seis métricas do spec (seção 7, E09): profissionais na praça,
-- densidade por raio de 5km, % de buscas com 5+ resultados, contratações,
-- adesão à verificação, tempo mediano de 1a resposta. Uma função só,
-- porque o dashboard sempre mostra as seis juntas — não há tela que precise
-- de uma sem as outras.
--
-- "Densidade por raio de 5km" = média, entre os profissionais ativos, de
-- quantos OUTROS profissionais ativos cada um tem num raio de 5km — é a
-- pergunta "este profissional está sozinho na região ou tem companhia?",
-- que é o que decide se a praça tem oferta suficiente pra reter demanda.
--
-- "Tempo mediano de 1a resposta" = mediana, por conversa, do tempo entre a
-- primeira mensagem e a primeira resposta da OUTRA pessoa — só conta
-- conversa que teve resposta; a que nunca foi respondida já está coberta
-- pela métrica de adesão/abandono implícita no funil, não aqui. Mesma ideia
-- de dado que alimenta enfileirar_lembretes_mensagem_sem_resposta (T08.5),
-- mas não dá pra reusar aquela função: ela só pega quem passou de 24h SEM
-- resposta nenhuma — o oposto do que esta métrica mede (quem RESPONDEU, e
-- em quanto tempo).

create or replace function public.admin_metricas_piloto()
returns table (
  profissionais_na_praca int,
  densidade_media_5km numeric,
  percentual_buscas_com_5_mais numeric,
  contratacoes_total int,
  contratacoes_concluidas int,
  adesao_verificacao_percentual numeric,
  tempo_mediano_resposta_horas numeric
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores veem as métricas do piloto.';
  end if;

  return query
  with ativos as (
    select w.id, w.location
    from public.worker_profiles w
    where w.ativo and w.location is not null
  ),
  densidade as (
    select a1.id,
           (select count(*) from ativos a2
            where a2.id <> a1.id and ST_DWithin(a1.location, a2.location, 5000)) as vizinhos
    from ativos a1
  ),
  primeiras_mensagens as (
    select distinct on (m.conversation_id)
           m.conversation_id, m.sender_id, m.created_at
    from public.messages m
    order by m.conversation_id, m.created_at asc
  ),
  respostas as (
    select pm.conversation_id,
           pm.created_at as primeira_mensagem_em,
           min(m2.created_at) as primeira_resposta_em
    from primeiras_mensagens pm
    join public.messages m2
      on m2.conversation_id = pm.conversation_id
     and m2.sender_id <> pm.sender_id
     and m2.created_at > pm.created_at
    group by pm.conversation_id, pm.created_at
  )
  select
    (select count(*) from ativos)::int,
    (select avg(vizinhos) from densidade),
    (select round(100.0 * count(*) filter (where numero_resultados >= 5) / nullif(count(*), 0), 1)
       from public.search_logs),
    (select count(*) from public.bookings)::int,
    (select count(*) from public.bookings where status = 'concluido')::int,
    (select round(100.0 * count(*) filter (where verificado_ate is not null and verificado_ate >= current_date)
                  / nullif(count(*) filter (where ativo), 0), 1)
       from public.worker_profiles),
    (select percentile_cont(0.5) within group (
       order by extract(epoch from (primeira_resposta_em - primeira_mensagem_em)) / 3600.0
     ) from respostas);
end;
$$;

comment on function public.admin_metricas_piloto is
  'T09.4: as seis métricas do dashboard do piloto. SECURITY DEFINER porque '
  'cruza worker_profiles.location, search_logs e messages — nenhuma delas '
  'tem RLS que libere leitura agregada pra authenticated comum. A checagem '
  'eh_admin() no corpo é quem autoriza, não GRANT (função não tem RLS).';

grant execute on function public.admin_metricas_piloto() to authenticated;
