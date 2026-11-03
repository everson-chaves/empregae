-- =============================================================================
-- T00.2 — Tabelas base: perfis, categorias e perfil profissional
-- Epic E00 — Fundação
-- =============================================================================

-- profiles -------------------------------------------------------------------
-- Estende auth.users. O id É o id do auth: um usuário, uma linha, sempre.
-- A criação é automática por trigger no signup (T01.5).

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (length(btrim(nome)) between 2 and 120),

  -- Telefone é único porque identifica a pessoa: a T01.2 permite login pelo
  -- número, mapeado internamente para um e-mail sintético. Nulo é permitido
  -- (Postgres aceita múltiplos nulos em coluna única) para quem se cadastrou
  -- só por e-mail e ainda não informou o número.
  telefone    text unique check (telefone ~ '^[1-9][0-9]{9,10}$'),

  avatar_url  text,
  tipo        tipo_perfil not null default 'cliente',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de qualquer usuário. Estende auth.users com os dados do domínio.';
comment on column public.profiles.telefone is
  'Somente dígitos, com DDD, sem o 55 do país. Ex.: 21987654321. '
  'NUNCA retornado em busca pública — só após conversa iniciada (LGPD).';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tocar_updated_at();

-- categories -----------------------------------------------------------------
-- Catálogo fechado de categorias de serviço. Populado pelo seed (T00.5) a
-- partir da estrutura de categorias que já existe no protótipo.

create table public.categories (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome   text not null,
  icone  text,
  ordem  int  not null default 0
);

comment on table public.categories is
  'Categorias de serviço. Catálogo fechado, editado só por admin.';

-- worker_profiles ------------------------------------------------------------
-- O anúncio do profissional. Um por usuário.

create table public.worker_profiles (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles (id) on delete cascade,

  descricao              text check (length(descricao) <= 2000),
  preco_medio_centavos   int  check (preco_medio_centavos >= 0),
  unidade_preco          unidade_preco,
  raio_atendimento_km    int  not null default 5
                              check (raio_atendimento_km between 1 and 100),

  -- Coordenada exata. NUNCA retornada ao cliente: a busca (T03.1) expõe
  -- apenas a distância calculada no servidor. Revelar isto é revelar onde a
  -- pessoa mora.
  location    extensions.geography(Point, 4326),

  -- Endereço aproximado. Este sim é público.
  bairro      text,
  cidade      text,
  uf          char(2) check (uf ~ '^[A-Z]{2}$'),

  ativo       boolean not null default false,

  -- Preenchido pelo fluxo de verificação (E07). Nulo = sem selo.
  verificado_ate date,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Garantia estrutural: um perfil ativo é sempre localizável e sempre tem
  -- preço. Sem isto, um perfil incompleto apareceria na busca sem distância
  -- nem valor, que é exatamente a tela vazia que a T03.5 tenta evitar.
  constraint perfil_ativo_esta_completo check (
    not ativo or (
      location  is not null and
      bairro    is not null and
      cidade    is not null and
      uf        is not null and
      descricao is not null and
      preco_medio_centavos is not null and
      unidade_preco        is not null
    )
  )
);

comment on table public.worker_profiles is
  'Anúncio do profissional. Um por usuário (profile_id é único).';
comment on column public.worker_profiles.location is
  'Coordenada exata, EPSG:4326. NUNCA exposta ao cliente — a busca retorna '
  'somente distancia_km calculada no servidor. Ver RLS na T00.4.';
comment on column public.worker_profiles.verificado_ate is
  'Validade do selo. Nulo = sem selo. Vencido = selo não exibido (T07.5).';

create trigger worker_profiles_updated_at
  before update on public.worker_profiles
  for each row execute function public.tocar_updated_at();

-- worker_categories ----------------------------------------------------------
-- N:N entre profissional e categoria. Chave primária composta impede duplicata
-- sem precisar de índice extra.

create table public.worker_categories (
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  category_id       uuid not null references public.categories (id)      on delete restrict,
  primary key (worker_profile_id, category_id)
);

comment on table public.worker_categories is
  'Categorias que o profissional atende. on delete restrict na categoria: '
  'não se apaga uma categoria que ainda tem profissional vinculado.';
