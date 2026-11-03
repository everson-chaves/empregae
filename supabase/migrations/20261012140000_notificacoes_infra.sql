-- =============================================================================
-- T08.1-T08.5 — Infraestrutura de notificações
-- Epic E08 — Notificações
--
-- Padrão "outbox transacional": os triggers de bookings/messages/verifications
-- só ENFILEIRAM um evento em notification_events, dentro da mesma transação
-- que já ia acontecer de qualquer forma (propor contratação, enviar
-- mensagem, aprovar verificação). Nenhum deles faz chamada de rede — uma
-- trigger que chama HTTP síncrono prende a transação inteira ao tempo de
-- resposta do provedor de e-mail/push, e se o provedor cair, a ação de
-- negócio (ex.: aceitar uma contratação) falharia junto. Quem efetivamente
-- manda e-mail/push é a Edge Function `processar-notificacoes`
-- (supabase/functions/processar-notificacoes/), disparada por pg_cron —
-- fora da transação, com retry sendo só "rodar nas próximas execuções".
-- =============================================================================

-- Tipos ------------------------------------------------------------------------

create type public.tipo_evento_notificacao as enum (
  'mensagem_nova',
  'contratacao_proposta',
  'contratacao_aceita',
  'contratacao_concluida',
  'verificacao_aprovada',
  'verificacao_reprovada',
  'verificacao_expirando',
  'mensagem_sem_resposta'
);

-- notification_preferences ------------------------------------------------------
-- T08.4 — liga/desliga por canal. Uma linha por pessoa, criada sob demanda
-- (a aplicação faz upsert na primeira visita à tela de preferências — não
-- há trigger de criação em profiles pra não acoplar E01 a E08).

create table public.notification_preferences (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  email_ativo         boolean not null default true,
  push_ativo          boolean not null default true,
  -- Token usado no link de descadastro no rodapé do e-mail (T08.4) — tem
  -- que funcionar SEM login (quem recebeu o e-mail pode não estar com
  -- sessão aberta no aparelho de onde está lendo), então não dá pra exigir
  -- auth.uid() nesse fluxo. Ver função desinscrever_email mais abaixo.
  desinscricao_token  uuid not null default gen_random_uuid(),
  updated_at          timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Preferência de canal por pessoa (T08.4). Linha criada sob demanda pela aplicação.';
comment on column public.notification_preferences.desinscricao_token is
  'Usado no link de descadastro do rodapé do e-mail, sem exigir login.';

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.tocar_updated_at();

alter table public.notification_preferences enable row level security;

create policy "usuario ve as proprias preferencias"
  on public.notification_preferences for select to authenticated
  using (profile_id = auth.uid());

create policy "usuario cria as proprias preferencias"
  on public.notification_preferences for insert to authenticated
  with check (profile_id = auth.uid());

create policy "usuario atualiza as proprias preferencias"
  on public.notification_preferences for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- push_subscriptions -------------------------------------------------------------
-- T08.2 — uma linha por dispositivo/navegador inscrito (uma pessoa pode ter
-- mais de um: celular e notebook, por exemplo).

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_chave  text not null,
  created_at  timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Inscrições de Web Push (T08.2), uma por navegador/dispositivo. endpoint é '
  'único: reinscrever o mesmo navegador atualiza, nunca duplica.';

alter table public.push_subscriptions enable row level security;

create policy "usuario gerencia as proprias inscricoes de push"
  on public.push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- notification_events --------------------------------------------------------
-- A fila (outbox). Sem policy nenhuma pra anon/authenticated: só os
-- triggers (que rodam como SECURITY DEFINER, dono da tabela) escrevem, e só
-- a Edge Function (service_role, que ignora RLS) lê e marca processado_em.
-- Nenhum cliente jamais precisa consultar isto diretamente.

create table public.notification_events (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  tipo           public.tipo_evento_notificacao not null,
  dados          jsonb not null default '{}'::jsonb,
  processado_em  timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.notification_events is
  'Outbox de notificações (T08.3). Trigger escreve, Edge Function '
  '(service_role) lê e marca processado_em. Sem RLS liberada pra ninguém.';

create index notification_events_pendentes
  on public.notification_events (created_at)
  where processado_em is null;

alter table public.notification_events enable row level security;
-- Nenhuma policy: default deny para anon e authenticated. service_role
-- ignora RLS e é quem a Edge Function usa.

-- Função auxiliar: enfileirar -------------------------------------------------

create or replace function public.enfileirar_evento_notificacao(
  p_profile_id uuid,
  p_tipo public.tipo_evento_notificacao,
  p_dados jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_events (profile_id, tipo, dados)
  values (p_profile_id, p_tipo, p_dados);
$$;

-- T08.3 — Disparo por evento: mensagem nova -----------------------------------

create or replace function public.notificar_mensagem_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destinatario uuid;
begin
  select case when c.client_id = new.sender_id then w.profile_id else c.client_id end
    into v_destinatario
  from public.conversations c
  join public.worker_profiles w on w.id = c.worker_profile_id
  where c.id = new.conversation_id;

  if v_destinatario is not null then
    perform public.enfileirar_evento_notificacao(
      v_destinatario, 'mensagem_nova',
      jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger messages_notificar_nova
  after insert on public.messages
  for each row execute function public.notificar_mensagem_nova();

-- T08.3 — Disparo por evento: contratação proposta/aceita/concluída ----------
-- O destinatário é sempre "o outro lado", não quem executou a ação —
-- auth.uid() dentro de uma SECURITY DEFINER chamada via PostgREST ainda lê
-- o uid de quem fez a requisição (vem do JWT, não muda com o DEFINER).

create or replace function public.notificar_evento_contratacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente uuid;
  v_profissional uuid;
  v_destinatario uuid;
  v_tipo public.tipo_evento_notificacao;
begin
  select c.client_id, w.profile_id into v_cliente, v_profissional
  from public.conversations c
  join public.worker_profiles w on w.id = c.worker_profile_id
  where c.id = new.conversation_id;

  v_destinatario := case when auth.uid() = v_cliente then v_profissional else v_cliente end;

  if tg_op = 'INSERT' and new.status = 'proposto' then
    v_tipo := 'contratacao_proposta';
  elsif tg_op = 'UPDATE' and new.status = 'aceito' and old.status is distinct from 'aceito' then
    v_tipo := 'contratacao_aceita';
  elsif tg_op = 'UPDATE' and new.status = 'concluido' and old.status is distinct from 'concluido' then
    v_tipo := 'contratacao_concluida';
  else
    return new;
  end if;

  if v_destinatario is not null then
    perform public.enfileirar_evento_notificacao(
      v_destinatario, v_tipo,
      jsonb_build_object('booking_id', new.id, 'conversation_id', new.conversation_id)
    );
  end if;
  return new;
end;
$$;

create trigger bookings_notificar_evento
  after insert or update of status on public.bookings
  for each row execute function public.notificar_evento_contratacao();

-- T08.3 — Disparo por evento: verificação aprovada/reprovada -----------------

create or replace function public.notificar_evento_verificacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_tipo public.tipo_evento_notificacao;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'aprovado' then
    v_tipo := 'verificacao_aprovada';
  elsif new.status = 'reprovado' then
    v_tipo := 'verificacao_reprovada';
  else
    return new;
  end if;

  select w.profile_id into v_profile_id
  from public.worker_profiles w
  where w.id = new.worker_profile_id;

  if v_profile_id is not null then
    perform public.enfileirar_evento_notificacao(v_profile_id, v_tipo, jsonb_build_object('verification_id', new.id));
  end if;
  return new;
end;
$$;

create trigger verifications_notificar_evento
  after update of status on public.verifications
  for each row execute function public.notificar_evento_verificacao();

-- T08.5 — Lembrete de mensagem não respondida (após 24h) ----------------------
-- Não é trigger (não é "no instante que algo aconteceu", é "nada aconteceu
-- por 24h") — é uma função que o pg_cron chama de hora em hora. Encontra,
-- por conversa, a última mensagem (nenhuma mais nova da OUTRA pessoa depois
-- dela) com mais de 24h e sem lembrete já enviado.

alter table public.messages add column lembrete_enviado_em timestamptz;

comment on column public.messages.lembrete_enviado_em is
  'T08.5: marca que já saiu o lembrete de "sem resposta" pra esta mensagem — '
  'evita reenviar lembrete a cada execução do cron.';

create or replace function public.enfileirar_lembretes_mensagem_sem_resposta()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantidade int := 0;
  r record;
  v_destinatario uuid;
begin
  for r in
    select m.id, m.conversation_id, m.sender_id, c.client_id, w.profile_id as dono_anuncio
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.worker_profiles w on w.id = c.worker_profile_id
    where m.lembrete_enviado_em is null
      and m.created_at <= now() - interval '24 hours'
      and not exists (
        select 1 from public.messages m2
        where m2.conversation_id = m.conversation_id
          and m2.sender_id <> m.sender_id
          and m2.created_at > m.created_at
      )
  loop
    v_destinatario := case when r.sender_id = r.client_id then r.dono_anuncio else r.client_id end;
    perform public.enfileirar_evento_notificacao(
      v_destinatario, 'mensagem_sem_resposta',
      jsonb_build_object('conversation_id', r.conversation_id, 'message_id', r.id)
    );
    update public.messages set lembrete_enviado_em = now() where id = r.id;
    v_quantidade := v_quantidade + 1;
  end loop;
  return v_quantidade;
end;
$$;

comment on function public.enfileirar_lembretes_mensagem_sem_resposta is
  'T08.5. Chamada pelo pg_cron de hora em hora (ver fim desta migration). '
  'O retorno (quantidade enfileirada) também alimenta a métrica de tempo '
  'mediano de primeira resposta (T09.4, Mês 4): cada linha de '
  'notification_events do tipo mensagem_sem_resposta é um caso que passou '
  'de 24h sem resposta.';

-- T07.5 (E07) — Aviso antes de expirar ----------------------------------------
-- Consome verificacoes_expirando_em (criada na migration da E07). Dedup
-- simples: não reenfileira se já mandou aviso pra esta pessoa nos últimos
-- `p_dias` dias — sem isso, o cron diário reenfileiraria o aviso todo dia
-- até o selo vencer de verdade.

create or replace function public.enfileirar_avisos_expiracao(p_dias int default 15)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantidade int := 0;
  r record;
begin
  for r in select * from public.verificacoes_expirando_em(p_dias)
  loop
    if not exists (
      select 1 from public.notification_events e
      where e.profile_id = r.profile_id
        and e.tipo = 'verificacao_expirando'
        and e.created_at > now() - make_interval(days => p_dias)
    ) then
      perform public.enfileirar_evento_notificacao(
        r.profile_id, 'verificacao_expirando',
        jsonb_build_object('worker_profile_id', r.worker_profile_id, 'verificado_ate', r.verificado_ate)
      );
      v_quantidade := v_quantidade + 1;
    end if;
  end loop;
  return v_quantidade;
end;
$$;

-- Descadastro de e-mail sem login (T08.4) -------------------------------------
-- RPC pública (grant a anon): o link no rodapé do e-mail chama isto direto,
-- sem sessão. O token é o segredo — só quem recebeu aquele e-mail específico
-- tem o link com o token certo.

create or replace function public.desinscrever_email(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.notification_preferences
  set email_ativo = false
  where desinscricao_token = p_token
  returning true;
$$;

comment on function public.desinscrever_email is
  'T08.4: descadastro de e-mail pelo link do rodapé, sem exigir login. '
  'Chamada via RPC pública (grant execute a anon, abaixo).';

grant execute on function public.desinscrever_email(uuid) to anon, authenticated;

-- pg_cron ----------------------------------------------------------------------
-- Enfileiramento é barato (SQL puro, sem rede) e roda de hora em hora. O
-- ENVIO de verdade (Edge Function processar-notificacoes, que chama Resend e
-- Web Push) precisa de PROJECT_URL + SERVICE_ROLE_KEY, que não dá pra
-- hardcodar numa migration versionada — ver docs/notificacoes-deploy.md para
-- o `cron.schedule` que chama a Edge Function via pg_net, a ser aplicado
-- depois do deploy com os secrets reais configurados.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'lembrete-mensagem-sem-resposta',
  '0 * * * *',
  $$select public.enfileirar_lembretes_mensagem_sem_resposta();$$
);

select cron.schedule(
  'aviso-expiracao-verificacao',
  '0 8 * * *',
  $$select public.enfileirar_avisos_expiracao(15);$$
);
