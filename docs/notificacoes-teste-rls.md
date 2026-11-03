# Teste manual de RLS das notificações (E08)

## Por que manual

Mesmo motivo dos outros roteiros (`docs/chat-teste-rls.md`,
`docs/contratacao-teste-rls.md`, `docs/verificacao-teste-rls.md`): sem
Supabase local neste ambiente.

## O que a RLS promete

- **`notification_preferences`** e **`push_subscriptions`**: cada pessoa só
  vê/edita a própria linha (`profile_id = auth.uid()`).
- **`notification_events`**: NINGUÉM com `anon`/`authenticated` lê, insere
  ou atualiza — zero policies de propósito. Só os triggers (que rodam como
  dono da tabela, via `security definer`) escrevem, e só `service_role`
  (a Edge Function) lê e marca `processado_em`.
- **`desinscrever_email`**: função pública (`grant execute a anon`), mas só
  afeta a linha cujo `desinscricao_token` bate com o argumento — não dá pra
  desinscrever ninguém sem o token certo.

## Roteiro (rodar localmente, com `supabase start`)

Precisa de **A** (qualquer conta) e **B** (outra conta).

1. Como **A**, chamar `buscarPreferencias` antes de nunca ter configurado
   nada. Esperado: devolve o padrão (tudo ligado) sem criar linha —
   conferir que `select * from notification_preferences where profile_id = A`
   continua vazio.
2. Como **A**, chamar `salvarPreferencias` desligando e-mail. Esperado:
   sucesso, cria/atualiza a linha de A.
3. Como **B**, tentar `select`/`update` na linha de A em
   `notification_preferences` (direto, ignorando `salvarPreferencias`).
   Esperado: **zero linhas** no select; update não afeta nada.
4. Como **A**, inscrever push (`inscreverPush`, requer HTTPS e permissão de
   notificação — testar num navegador de verdade, não headless). Esperado:
   sucesso, cria linha em `push_subscriptions`.
5. Como **B**, tentar `select` nas inscrições de push de A. Esperado:
   **zero linhas**.
6. Como **A** ou **B**, tentar `select` em `notification_events`, mesmo em
   linhas próprias (`profile_id = auth.uid()`). Esperado: **zero linhas** —
   não existe policy nenhuma de select pra essa tabela, nem pra dono.
7. Propor uma contratação (como no roteiro de `contratacao-teste-rls.md`) e,
   com a connection string do banco (não a API), conferir que apareceu uma
   linha em `notification_events` — prova que o trigger (que roda como
   dono) escreve mesmo sem nenhuma policy liberando pra `authenticated`.
8. Chamar `desinscrever_email` com um token errado/aleatório. Esperado:
   devolve `false`/nulo, nenhuma linha afetada.
9. Chamar `desinscrever_email` com o token real de A (lido direto do banco,
   já que a API não expõe `desinscricao_token` pra ninguém verificar antes —
   isso é esperado, é um segredo). Esperado: `email_ativo` de A vira
   `false`, mesmo sem sessão nenhuma (chamar deslogado).

## Se algum passo falhar

O passo 6 é o mais importante: `notification_events` carrega metadado
sobre com quem cada pessoa está conversando/contratando (via `dados`
jsonb). Qualquer policy de select que apareça ali por engano, mesmo
restrita ao próprio dono, abriria um canal de leitura que não existe em
nenhuma outra tabela do produto — é bloqueante.
