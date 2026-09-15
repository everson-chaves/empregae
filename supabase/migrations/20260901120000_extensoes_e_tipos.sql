-- =============================================================================
-- T00.2 — Extensões e tipos base
-- Epic E00 — Fundação
--
-- Primeira migration do schema. Cria as extensões e os tipos enumerados
-- usados pelas tabelas seguintes.
--
-- Nota de escopo: a extensão PostGIS nominalmente pertence à T00.3, mas está
-- aqui porque `worker_profiles.location` é do tipo `geography` e a tabela não
-- pode ser criada sem ela. A T00.3 fica com os índices (GiST e de FK).
-- =============================================================================

-- Extensões ------------------------------------------------------------------
-- Convenção do Supabase: extensões vivem no schema `extensions`, não em
-- `public`. O `extra_search_path` do config.toml já inclui esse schema.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Tipos enumerados -----------------------------------------------------------
-- Enum nativo em vez de check constraint com texto: o gerador de tipos do
-- Supabase (T00.7) transforma cada enum em union type do TypeScript, o que dá
-- erro de compilação quando alguém escreve um status que não existe.
--
-- O custo é que adicionar um valor novo exige `alter type`. Aceitável: estes
-- conjuntos vêm do modelo de negócio e não mudam sem decisão de produto.

-- Um usuário pode contratar, prestar serviço, ou os dois.
create type tipo_perfil as enum ('cliente', 'profissional', 'ambos');

-- Como o profissional cobra. Não é o valor, é a unidade dele.
create type unidade_preco as enum ('hora', 'diaria', 'servico');

-- Ciclo de vida da contratação. `concluido` é o estado que destrava a
-- avaliação (E06) — é a trava estrutural da reputação.
create type status_booking as enum ('proposto', 'aceito', 'concluido', 'cancelado');

-- Fila de verificação de antecedentes. No piloto a transição é manual, feita
-- pelo grupo no painel admin (E09).
create type status_verificacao as enum ('pendente', 'aprovado', 'reprovado');

-- Camadas de receita do modelo de negócio.
create type tipo_pagamento as enum ('verificacao', 'boost', 'b2b');

create type status_pagamento as enum ('pendente', 'pago', 'falhou', 'estornado');

-- Período de impulsionamento. `ativo` é o que a busca (T03.1) consulta para
-- ordenar resultados.
create type status_boost as enum ('pendente', 'ativo', 'expirado', 'cancelado');

-- Utilitário: manutenção de updated_at ---------------------------------------
-- Aplicado por trigger nas tabelas que sofrem edição. Poupa o app de lembrar
-- de atualizar o campo, e garante que o valor é do servidor e não do cliente.

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.tocar_updated_at is
  'Trigger de BEFORE UPDATE: mantém updated_at com a hora do servidor.';
