# Deploy das notificações (E08)

Infra como código até onde dá — RLS, triggers e as duas funções de
enfileiramento já estão nas migrations e sobem com `supabase db push`. O
que falta depois do deploy (chaves reais, uma vez por ambiente):

## 1. Secrets da Edge Function

```
supabase secrets set RESEND_API_KEY=<chave do Resend>
supabase secrets set VAPID_PUBLIC_KEY=<chave pública do par VAPID>
supabase secrets set VAPID_PRIVATE_KEY=<chave privada do par VAPID>
supabase secrets set VAPID_SUBJECT=mailto:contato@empregae.com.br
supabase secrets set APP_URL=https://empregae.com.br
```

Gerar o par VAPID: `npx web-push generate-vapid-keys`. A chave PÚBLICA
também vai em `VITE_VAPID_PUBLIC_KEY` no `.env` do app (ver `.env.example`)
— é a mesma chave, só que o navegador também precisa dela para `subscribe`.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão em toda
Edge Function do Supabase — não precisam ser configuradas.

## 2. Domínio verificado no Resend (T08.1)

O `from` em `supabase/functions/processar-notificacoes/index.ts` usa
`notificacoes@empregae.com.br` — isso só funciona depois de verificar o
domínio `empregae.com.br` no painel do Resend (DNS: SPF + DKIM). Até lá,
trocar por `onboarding@resend.dev` (remetente de teste do próprio Resend)
pra testar em desenvolvimento.

## 3. Deploy da função

```
supabase functions deploy processar-notificacoes
```

## 4. Agendar a execução (pg_cron + pg_net)

A migration desta epic já agenda o ENFILEIRAMENTO (`enfileirar_lembretes_mensagem_sem_resposta`
de hora em hora, `enfileirar_avisos_expiracao` uma vez por dia) — isso é
SQL puro, sem segredo nenhum, por isso já está versionado. O que falta é
agendar o CONSUMO da fila (a Edge Function em si), que precisa da URL do
projeto e do service_role key — não dá pra versionar isso numa migration
pública. Depois do deploy, rodar uma vez (via SQL editor do painel, ou uma
migration local não commitada):

```sql
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'processar-notificacoes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<URL_DO_PROJETO>/functions/v1/processar-notificacoes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## 5. Roteiro de verificação manual (sem Supabase local, mesmo motivo dos
   outros `docs/*-teste-rls.md`)

1. Propor uma contratação → conferir uma linha nova em `notification_events`
   com `tipo = 'contratacao_proposta'` e `processado_em is null`.
2. Rodar `select public.enfileirar_lembretes_mensagem_sem_resposta();` sem
   ter passado 24h → esperado `0` (nada qualificado ainda).
3. Com as secrets configuradas, invocar a função manualmente:
   `supabase functions invoke processar-notificacoes` → conferir que o
   evento do passo 1 teve `processado_em` preenchido, e que o e-mail
   chegou (ou o log do Resend mostra o envio).
4. Desativar `email_ativo` em `/notificacoes` e repetir o passo 1 → o novo
   evento não deve gerar e-mail (mas continua marcado como processado).
5. Clicar no link de descadastro do rodapé do e-mail (ou chamar
   `desinscrever_email` direto com o token) → `email_ativo` vira `false`
   sem precisar estar logado.
