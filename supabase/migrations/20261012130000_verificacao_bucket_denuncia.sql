-- =============================================================================
-- T07.1 — Bucket privado de documentos · T07.6 — Canal de denúncia
-- Epic E07 — Verificação e selo
--
-- O essencial do ciclo de verificação (tabela `verifications`, enum
-- `status_verificacao`, RLS "profissional solicita/ve a própria verificação"
-- + "admin decide") já existia desde a T00.2/T00.4 — essa RLS já cobre T07.2
-- por inteiro (inserir com status='pendente', reenvio é só inserir de novo
-- depois de reprovado). O que faltava era: onde o ARQUIVO do documento fica
-- (este bucket), e onde uma denúncia de profissional verificado fica
-- registrada (tabela nova).
-- =============================================================================

-- Bucket de documentos de verificação -----------------------------------------
-- Privado de verdade: ao contrário do bucket de avatares, NINGUÉM lê um
-- arquivo daqui pela API pública — nem o próprio profissional que enviou
-- (mesma politica de verifications.documento_url, T00.4: "some para todo
-- mundo, inclusive para quem enviou"). O admin revisa pelo painel (T09.2,
-- Mês 4), que vai precisar de uma função SECURITY DEFINER dedicada para
-- gerar URL assinada — não existe ainda porque T09.2 não é desta epic.
--
-- Path esperado: verificacoes/<profile_id>/<timestamp>.<ext>
--
-- Tipos aceitos e limite de tamanho (T07.1) entram direto na config do
-- bucket, não só na validação client-side de lib/verificacao.ts — valida
-- nos dois lugares, porque a validação client-side não impede alguém de
-- chamar a API direto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verificacoes',
  'verificacoes',
  false,
  8388608, -- 8MB
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

create policy "profissional envia o proprio documento de verificacao"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verificacoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nem o próprio profissional lê de volta — não existe policy de select pra
-- authenticated. Só admin.
create policy "admin le documentos de verificacao"
  on storage.objects for select to authenticated
  using (bucket_id = 'verificacoes' and public.eh_admin());

-- worker_reports ---------------------------------------------------------------
-- Canal de denúncia (T07.6). Aberto a qualquer um que esteja vendo o perfil
-- público — inclusive anon, já que a busca e o perfil público não exigem
-- login (T02.6/T03.1). `reporter_id` é nullable e `on delete set null` pelo
-- mesmo motivo de concluido_por/revisado_por/cancelado_por: quem denunciou
-- pode excluir a conta depois sem travar a denúncia.
--
-- Entra na fila do admin (T09.3, Mês 4) — esta migration só cria o lugar
-- onde a denúncia fica registrada e a rota direta pro admin; moderar é de
-- outra epic.

create table public.worker_reports (
  id                uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  reporter_id       uuid references public.profiles (id) on delete set null,

  motivo            text not null check (length(btrim(motivo)) between 1 and 1000),

  resolvida         boolean not null default false,

  created_at        timestamptz not null default now()
);

comment on table public.worker_reports is
  'Denúncia de um profissional verificado (T07.6). Entra na fila do admin '
  '(T09.3). Leitura restrita a admin — denunciante não vê a própria '
  'denúncia de volta, só confirma que foi enviada.';

alter table public.worker_reports enable row level security;

create policy "qualquer um denuncia um profissional"
  on public.worker_reports for insert to anon, authenticated
  with check (true);

create policy "admin le as denuncias"
  on public.worker_reports for select to authenticated
  using (public.eh_admin());

create policy "admin resolve denuncias"
  on public.worker_reports for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Função auxiliar para T07.5 (expiração) --------------------------------------
-- "Remover selo vencido" não precisa de rotina nenhuma: o selo (T07.3) é
-- calculado na hora, comparando verificado_ate com now() — sem campo de
-- "ativo" pra desligar, não tem o que "remover" de verdade. O que precisa
-- de rotina é o AVISO antes de vencer (T07.5), que é disparo por evento
-- (T08.3, Epic E08) — esta função só devolve quem está perto de vencer,
-- pronta pra ser chamada por aquele disparo.
create or replace function public.verificacoes_expirando_em(dias int)
returns table (worker_profile_id uuid, profile_id uuid, verificado_ate date)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.profile_id, w.verificado_ate
  from public.worker_profiles w
  where w.verificado_ate is not null
    and w.verificado_ate between current_date and (current_date + dias);
$$;

comment on function public.verificacoes_expirando_em is
  'T07.5: profissionais cujo selo vence nos próximos N dias. Consumida pelo '
  'disparo por evento da E08 (T08.3/T08.5) para o aviso antes de expirar.';
