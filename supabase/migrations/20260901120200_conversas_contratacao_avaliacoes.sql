-- =============================================================================
-- T00.2 — Conversas, contratação e avaliações
-- Epic E00 — Fundação
--
-- O núcleo do produto. A cadeia conversation → booking → review é o que
-- transforma "um classificado" em "um marketplace com reputação verificável".
-- =============================================================================

-- conversations --------------------------------------------------------------
-- Uma conversa por par cliente/profissional. O botão de WhatsApp sai do produto
-- (T04.6) justamente para que esta tabela exista: sem registro da conversa não
-- há avaliação verificável nem dado de conversão.

create table public.conversations (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.profiles (id)        on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,

  -- Respostas do formulário estruturado por categoria (T04.1). Faz o cliente
  -- chegar na conversa com o pedido já descrito, em vez de "oi, tudo bem?".
  briefing          jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now(),

  -- Impede conversa duplicada entre o mesmo par (subtask da T04.1). Estrutural,
  -- não checagem de aplicação: não há caminho de código que crie a segunda.
  constraint conversa_unica_por_par unique (client_id, worker_profile_id)
);

comment on table public.conversations is
  'Conversa entre um cliente e um profissional. Única por par.';

-- messages -------------------------------------------------------------------

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id)      on delete cascade,

  body            text not null check (length(btrim(body)) between 1 and 4000),

  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

comment on table public.messages is
  'Mensagens da conversa. Legível apenas pelos dois participantes (RLS, T00.4).';
comment on column public.messages.body is
  'Texto livre. Deliberadamente NÃO bloqueia troca de número de telefone: '
  'bloqueio é contornável ("nove nove um dois") e só piora a experiência. '
  'O objetivo do chat é registrar que a conversa existiu, não prender ninguém.';

-- bookings -------------------------------------------------------------------
-- Registro da contratação, SEM processar pagamento. Entrega avaliação
-- verificada, volume transacionado e dados de recorrência por uma fração do
-- custo de engenharia de um split de pagamento.

create table public.bookings (
  id                       uuid primary key default gen_random_uuid(),
  conversation_id          uuid not null references public.conversations (id) on delete cascade,

  status                   status_booking not null default 'proposto',
  valor_combinado_centavos int  not null check (valor_combinado_centavos >= 0),
  data_servico             date not null,

  concluido_em             timestamptz,
  concluido_por            uuid references public.profiles (id) on delete set null,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Coerência entre status e marcas de conclusão. Sem isto seria possível ter
  -- uma contratação `concluido` sem saber quando nem por quem — e é
  -- exatamente `concluido` que libera a avaliação.
  constraint conclusao_coerente_com_status check (
    (status =  'concluido' and concluido_em is not null and concluido_por is not null) or
    (status <> 'concluido' and concluido_em is null     and concluido_por is null)
  )
);

comment on table public.bookings is
  'Contratação registrada, sem movimentação de dinheiro. A transição para '
  'concluido é o que destrava a avaliação (E06).';

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.tocar_updated_at();

-- reviews --------------------------------------------------------------------
-- O fosso competitivo do produto.
--
-- A trava contra avaliação falsa é ESTRUTURAL, não de aplicação:
--
--   1. booking_id é NOT NULL  → não existe avaliação sem contratação
--   2. booking_id é UNIQUE    → no máximo uma avaliação por contratação
--   3. FK com on delete restrict → não se apaga a contratação para apagar
--      o rastro de uma avaliação ruim
--
-- A exigência de `status = 'concluido'` vem por RLS na T00.4, e o teste que
-- prova que a trava funciona é a T06.1.

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),

  booking_id  uuid not null unique references public.bookings (id) on delete restrict,
  autor_id    uuid not null references public.profiles (id) on delete cascade,

  nota        int  not null check (nota between 1 and 5),
  comentario  text check (length(comentario) <= 2000),

  -- Marcada para moderação pela T06.5. Não remove automaticamente: quem
  -- decide é o admin (T09.3).
  denunciada  boolean not null default false,

  created_at  timestamptz not null default now()
);

comment on table public.reviews is
  'Avaliação verificada. booking_id NOT NULL + UNIQUE + on delete restrict '
  'tornam avaliação sem contratação concluída impossível por construção.';
