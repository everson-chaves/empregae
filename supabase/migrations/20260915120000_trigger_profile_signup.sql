-- =============================================================================
-- T01.5 — Criação automática do profiles
-- Epic E01 — Autenticação
--
-- Sem isto, `auth.signUp` cria o usuário em `auth.users` e o app fica com uma
-- sessão válida apontando para um `profiles` que não existe — toda consulta
-- que faz join com `profiles` (praticamente todas) quebra silenciosamente.
--
-- Rollback em falha: o trigger roda na MESMA transação que o INSERT em
-- `auth.users` durante o signup. Se a inserção do profile falhar (ex.: nome
-- vazio, violação de constraint), a exceção propaga e o Postgres desfaz a
-- transação inteira — o usuário nem chega a existir em `auth.users`. Não há
-- caminho para uma conta órfã sem profile.
-- =============================================================================

create or replace function public.criar_profile_no_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `nome` vem do metadata que o cliente passa em `options.data.nome` no
  -- signUp (T01.1). Sem metadata (ex.: usuário criado direto no painel),
  -- cai para a parte local do e-mail — nunca deixa `nome` vazio, porque a
  -- coluna é NOT NULL e o check exige de 2 a 120 caracteres.
  --
  -- `telefone` (T01.2) só vem preenchido quando o cadastro foi feito com
  -- telefone como identificador (src/lib/auth.ts#cadastrar) — nesse caso o
  -- e-mail em auth.users é sintético, e quem o app trata como "o telefone da
  -- pessoa" é esta coluna, nunca o e-mail. Em cadastro por e-mail, fica NULL
  -- (a unique constraint aceita múltiplos NULL sem conflito).
  insert into public.profiles (id, nome, telefone)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'telefone'), '')
  );
  return new;
end;
$$;

comment on function public.criar_profile_no_signup is
  'Cria a linha de public.profiles no mesmo INSERT que cria o usuário em '
  'auth.users. Falha aqui desfaz o signup inteiro (mesma transação).';

create trigger criar_profile_apos_signup
  after insert on auth.users
  for each row execute function public.criar_profile_no_signup();
