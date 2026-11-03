-- =============================================================================
-- T00.3 — Índices
-- Epic E00 — Fundação
--
-- A extensão PostGIS e a coluna `location` já vieram na T00.2, porque
-- worker_profiles não pode ser criada sem elas. Sobra aqui o que é de fato
-- desta task: o índice geoespacial e os índices de chave estrangeira.
--
-- Duas coisas que o Postgres NÃO faz sozinho e por isso estão aqui:
--
--   1. Índice em coluna de FK. Ele cria índice só para PK e UNIQUE. Sem
--      índice na ponta que referencia, todo DELETE no lado referenciado
--      varre a tabela inteira para checar as filhas — e as nossas cascatas
--      partem de `profiles`, que é a tabela mais referenciada do schema.
--
--   2. Índice para busca geográfica. Sem GiST, ST_DWithin vira sequential
--      scan calculando distância geodésica linha a linha.
-- =============================================================================

-- Busca geográfica -----------------------------------------------------------
-- Índice PARCIAL: a busca sempre filtra `ativo`, e perfil inativo nunca
-- aparece em resultado. Indexar só os ativos deixa o índice menor e evita
-- carregar perfis incompletos ou desligados no caminho quente.
--
-- Consulta que ele serve (T03.1):
--   where w.ativo and ST_DWithin(w.location, :origem, :raio_metros)

create index idx_worker_profiles_location_ativo
  on public.worker_profiles using gist (location)
  where ativo;

comment on index public.idx_worker_profiles_location_ativo is
  'GiST parcial para ST_DWithin na busca por raio. Só perfis ativos.';

-- Expiração do selo de verificação (T07.5): rotina que varre quem vence.
create index idx_worker_profiles_verificado_ate
  on public.worker_profiles (verificado_ate)
  where verificado_ate is not null;

-- Chaves estrangeiras sem cobertura ------------------------------------------
-- As demais FKs do schema já estão cobertas por PK ou UNIQUE:
--   profiles.id, worker_profiles.profile_id, reviews.booking_id,
--   worker_categories.worker_profile_id (1ª coluna da PK composta),
--   conversations.client_id (1ª coluna do unique do par).
-- As de baixo são as que ficaram descobertas.

-- Segunda coluna da PK composta: serve tanto a FK quanto a busca por
-- categoria ("todos os profissionais de eletricista").
create index idx_worker_categories_category
  on public.worker_categories (category_id, worker_profile_id);

-- Segunda coluna do unique do par: é por aqui que se lista as conversas do
-- lado do profissional, e é o caminho do join que calcula a nota média.
create index idx_conversations_worker_profile
  on public.conversations (worker_profile_id);

create index idx_messages_sender
  on public.messages (sender_id);

create index idx_bookings_concluido_por
  on public.bookings (concluido_por)
  where concluido_por is not null;

create index idx_reviews_autor
  on public.reviews (autor_id);

create index idx_verifications_worker_profile
  on public.verifications (worker_profile_id);

create index idx_verifications_revisado_por
  on public.verifications (revisado_por)
  where revisado_por is not null;

create index idx_payments_profile
  on public.payments (profile_id);

create index idx_boosts_payment
  on public.boosts (payment_id)
  where payment_id is not null;

-- Índices das consultas quentes ----------------------------------------------
-- Estes não são só FK: são o formato exato da consulta que o produto faz.

-- Chat: carregar as mensagens de uma conversa, mais recentes primeiro (T04.2).
-- Composto, então também cobre a FK messages.conversation_id sozinha.
create index idx_messages_conversa_recentes
  on public.messages (conversation_id, created_at desc);

-- Contador de não lidas (T04.4). Parcial: mensagem lida sai do índice, então
-- ele encolhe conforme as pessoas leem — que é o estado normal.
create index idx_messages_nao_lidas
  on public.messages (conversation_id)
  where read_at is null;

-- Contratações de uma conversa (T05.5). Cobre a FK bookings.conversation_id.
create index idx_bookings_conversa
  on public.bookings (conversation_id, created_at desc);

-- Volume transacionado e recorrência (T05.6, T09.4): só as concluídas
-- interessam, e é sobre elas que a métrica é somada.
create index idx_bookings_concluidas
  on public.bookings (concluido_em desc)
  where status = 'concluido';

-- Fila do admin (T09.2). Parcial: a fila é sempre "o que está pendente".
create index idx_verifications_pendentes
  on public.verifications (created_at)
  where status = 'pendente';

-- Impulsionamento ativo, consultado pela ordenação da busca (T03.1):
--   where worker_profile_id = ? and now() between inicio and fim
--     and status = 'ativo'
-- Fora do MVP1, mas o índice acompanha a tabela para a busca não precisar
-- de nova migration depois.
create index idx_boosts_ativos
  on public.boosts (worker_profile_id, inicio, fim)
  where status = 'ativo';

-- Moderação de avaliações denunciadas (T06.5 → T09.3).
create index idx_reviews_denunciadas
  on public.reviews (created_at)
  where denunciada;

-- Catálogo de categorias na ordem de exibição.
create index idx_categories_ordem
  on public.categories (ordem, nome);
