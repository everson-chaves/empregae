-- =============================================================================
-- T01.6 — Onboarding: consentimento LGPD explícito
-- Epic E01 — Autenticação
-- =============================================================================
-- Guarda QUANDO a pessoa deu o consentimento explícito no onboarding — não o
-- texto do termo em si (isso é a T10.1: termos de uso e política de
-- privacidade completos, antes do piloto). NULL = onboarding ainda não
-- aconteceu; é o sinal que RotaProtegida usa para redirecionar a pessoa para
-- lá antes de deixar entrar em qualquer rota que exige sessão.

alter table public.profiles
  add column consentimento_lgpd_em timestamptz;

comment on column public.profiles.consentimento_lgpd_em is
  'Quando a pessoa deu consentimento explícito no onboarding (T01.6). '
  'NULL = onboarding pendente. O texto do termo em si é da T10.1.';

-- Coluna nova nasce privada (ver "seção 3" de 20260911100000_rls.sql — quem
-- adiciona campo sensível precisa conceder select explicitamente). Este não
-- é sensível, mas também não é público: só quem está logado precisa ler o
-- próprio valor, para saber se falta onboarding.
grant select (consentimento_lgpd_em) on public.profiles to authenticated;
