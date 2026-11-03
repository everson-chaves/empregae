-- =============================================================================
-- T04.3 — Realtime do chat
-- =============================================================================
--
-- `supabase_realtime` é a publication que o Supabase já cria por padrão em
-- todo projeto novo -- aqui só ADICIONAMOS as tabelas que o chat precisa
-- ouvir. O DO block checa antes de adicionar: rodar a migration de novo (ou
-- ela já ter sido aplicada manualmente no painel por alguém) não pode
-- quebrar com "relation is already member of publication".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
