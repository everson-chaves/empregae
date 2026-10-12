# Teste manual de RLS da verificação (E07)

## Por que manual

Mesmo motivo de `docs/chat-teste-rls.md` e `docs/contratacao-teste-rls.md`:
sem Supabase local (Docker) neste ambiente, não dá pra rodar contra um
Postgres de verdade com dois usuários autenticados e o bucket de Storage.
As policies de `verifications` já existiam desde a T00.4; as novas desta
epic são as de `storage.objects` (bucket `verificacoes`) e de
`worker_reports` (`supabase/migrations/20261012130000_verificacao_bucket_denuncia.sql`).

## O que a RLS promete

- **Bucket `verificacoes`**: só o dono envia pra própria pasta (`"profissional
  envia o proprio documento de verificacao"`, `(storage.foldername(name))[1]
  = auth.uid()::text`). NINGUÉM lê — nem o select de admin existe pra
  qualquer authenticated, só quem passa em `eh_admin()`.
- **`verifications`**: inalterado desde a T00.4 — profissional vê e insere
  (com `status = 'pendente'`) a própria; só admin atualiza (aprova/reprova).
- **`worker_reports`**: qualquer um insere (`anon, authenticated`, `with
  check (true)`) — não exige login, pois a página pública também não exige.
  Só admin lê e resolve.

## Roteiro (rodar localmente, com `supabase start`)

Precisa de **A** (profissional, dono de um `worker_profiles`), **B**
(qualquer outra conta) e, se possível, uma linha em `admins` para testar o
caminho de admin.

1. Como **A**, enviar um documento (`solicitarVerificacao`). Esperado:
   sucesso — o arquivo sobe pra `verificacoes/<A>/...` e a linha em
   `verifications` é criada com `status = 'pendente'`.
2. Como **A**, tentar ler o próprio arquivo de volta (`supabase.storage.from('verificacoes').download(caminho)`
   ou gerar URL pública). Esperado: **rejeitado** — não existe policy de
   select pra `authenticated` sem `eh_admin()`, só a de admin.
3. Como **B**, tentar enviar um arquivo pra pasta de A
   (`verificacoes/<A>/arquivo.jpg`). Esperado: **rejeitado** pela policy de
   insert (`(storage.foldername(name))[1] = auth.uid()::text`, e
   `auth.uid()` aqui é B, não A).
4. Como **B**, tentar ler ou listar arquivos da pasta de A. Esperado:
   **rejeitado** — mesmo motivo do passo 2, vale pra qualquer
   `authenticated` sem ser admin.
5. Com uma conta em `admins`, tentar ler o arquivo de A. Esperado: sucesso
   (`"admin le documentos de verificacao"`).
6. Como **A** (sem estar logada), ou como **B**, denunciar o próprio
   profissional de A pela página pública (`denunciarProfissional`), inclusive
   **deslogado** (anon). Esperado: sucesso nos dois casos — `worker_reports`
   aceita `anon` e `authenticated`.
7. Como **A** ou **B** (sem ser admin), tentar `select` em `worker_reports`.
   Esperado: **zero linhas** — só admin lê.
8. Com a conta admin, `select` em `worker_reports`. Esperado: sucesso, vê a
   denúncia do passo 6.

## Se algum passo falhar

O passo 2 é o mais importante: o documento de identidade é o dado mais
sensível do produto (T07.1 — "DADO SENSÍVEL"). Qualquer forma de um usuário
comum (mesmo o próprio dono) conseguir ler de volta o próprio documento, ou
o de outra pessoa, é bloqueante para o merge.
