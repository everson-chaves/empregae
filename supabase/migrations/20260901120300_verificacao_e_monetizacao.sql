-- =============================================================================
-- T00.2 — Verificação, pagamentos e impulsionamento
-- Epic E00 — Fundação
--
-- Nota de escopo: `payments` e `boosts` suportam funcionalidades que estão
-- FORA do MVP1 (impulsionamento pago com Pix é segunda onda). As tabelas
-- entram agora mesmo assim porque a consulta de busca da T03.1 ordena por
-- `impulsionado`, e ela precisa de uma tabela `boosts` para consultar — vazia
-- é suficiente. Criar depois obrigaria a mexer na função de busca já pronta.
-- =============================================================================

-- verifications --------------------------------------------------------------
-- Fila de verificação de antecedentes.
--
-- No piloto o processo é MANUAL nas duas pontas: o grupo faz a consulta avulsa
-- no provedor, fora do sistema, e registra o resultado aqui pelo painel admin
-- (T09.2). Cem profissionais dá para verificar na mão — custo de engenharia
-- zero e resultado idêntico para o usuário.

create table public.verifications (
  id                uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,

  status            status_verificacao not null default 'pendente',

  -- Dado sensível: acessível SOMENTE a admin (RLS, T00.4). Bucket privado.
  documento_url     text,
  tipo_documento    text,

  revisado_por      uuid references public.profiles (id) on delete set null,
  revisado_em       timestamptz,
  validade          date,
  observacao        text,

  created_at        timestamptz not null default now(),

  -- Uma decisão precisa registrar quem decidiu e quando. Aprovação anônima
  -- em fluxo de antecedentes é problema de auditoria.
  constraint revisao_coerente_com_status check (
    (status =  'pendente' and revisado_por is null     and revisado_em is null) or
    (status <> 'pendente' and revisado_por is not null and revisado_em is not null)
  ),

  -- Aprovado sem validade viraria selo eterno. A validade é anual (T07.5).
  constraint aprovado_tem_validade check (
    status <> 'aprovado' or validade is not null
  )
);

comment on table public.verifications is
  'Fila de verificação de antecedentes. Transição manual pelo admin no piloto.';
comment on column public.verifications.documento_url is
  'Documento de identidade. DADO SENSÍVEL: bucket privado, RLS restrita a '
  'admin. Nunca exposto ao público nem ao próprio profissional após envio.';

-- payments -------------------------------------------------------------------
-- Cobranças da plataforma: verificação, impulsionamento e contrato B2B.
-- NÃO registra o pagamento do serviço contratado — a plataforma
-- deliberadamente não intermedia esse dinheiro.

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete restrict,

  tipo           tipo_pagamento   not null,
  status         status_pagamento not null default 'pendente',
  valor_centavos int not null check (valor_centavos > 0),

  provedor       text,
  provedor_id    text,

  pago_em        timestamptz,
  created_at     timestamptz not null default now(),

  constraint pago_tem_data check (
    (status =  'pago' and pago_em is not null) or
    (status <> 'pago' and pago_em is null)
  ),

  -- Idempotência: o webhook do provedor pode chegar duas vezes para a mesma
  -- cobrança. Sem isto, um retry vira pagamento duplicado no relatório.
  constraint pagamento_unico_no_provedor unique (provedor, provedor_id)
);

comment on table public.payments is
  'Receita da plataforma (verificação, boost, B2B). NÃO registra o pagamento '
  'do serviço contratado — a plataforma não intermedia esse dinheiro.';

-- boosts ---------------------------------------------------------------------
-- Período de impulsionamento. Consultado pela busca (T03.1) para ordenar.
-- Fora do MVP1, mas a tabela existe para a busca poder consultá-la.

create table public.boosts (
  id                uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  payment_id        uuid references public.payments (id) on delete set null,

  status            status_boost not null default 'pendente',
  inicio            timestamptz not null,
  fim               timestamptz not null,
  valor_centavos    int not null check (valor_centavos >= 0),

  created_at        timestamptz not null default now(),

  constraint periodo_valido check (fim > inicio)
);

comment on table public.boosts is
  'Período de impulsionamento pago. FORA DO MVP1 — a tabela existe porque a '
  'busca (T03.1) ordena por impulsionado e precisa consultá-la, ainda que vazia.';
