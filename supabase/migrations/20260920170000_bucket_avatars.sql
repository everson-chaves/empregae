-- =============================================================================
-- T02.2 — Bucket de Storage para foto de perfil
-- Epic E02 — Perfil do profissional
-- =============================================================================
--
-- Bucket público: a foto de perfil aparece na busca e na página pública do
-- anúncio (T02.6), então não há por que escondê-la atrás de URL assinada.
-- O que precisa de RLS é a ESCRITA: cada pessoa só grava dentro da própria
-- pasta, nomeada com o seu id (storage.foldername extrai o primeiro
-- segmento do path, ex.: "<uid>/avatar.jpg" -> uid).
--
-- Path esperado: avatars/<profile_id>/<timestamp>.<ext>
-- O timestamp no nome evita cache de CDN servindo a foto antiga depois de
-- trocar; profiles.avatar_url sempre aponta para o arquivo mais recente.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar e publico para leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "usuario envia o proprio avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuario atualiza o proprio avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuario remove o proprio avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
