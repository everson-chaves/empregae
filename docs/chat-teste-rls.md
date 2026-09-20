# Teste manual de RLS do chat (T04.5)

## Por que manual, e não um teste automatizado rodando aqui

Este ambiente não tem Supabase local (Docker) disponível — não dá pra
rodar `supabase start` nem um teste de integração que bata direto no
Postgres com `service_role` ou com dois usuários autenticados reais. As
policies abaixo foram escritas e revisadas à mão (ver
`supabase/migrations/20260911100000_rls.sql`), e o app (`src/lib/chat.ts`)
foi escrito pra depender só delas — mas a prova de que a RLS realmente
barra terceiro precisa rodar uma vez contra um Postgres de verdade antes
do merge. Este documento é esse roteiro.

## O que a RLS promete

- **`conversations`**: só os dois lados da conversa (cliente e
  profissional) veem a linha (`"so os dois lados veem a conversa"`, via
  `participa_da_conversa(id)`) ou um admin (`eh_admin()`). Só o próprio
  cliente pode criar uma conversa em seu nome (`"cliente abre a
  conversa"`, `client_id = auth.uid()`).
- **`messages`**: só os dois lados leem (`"so os dois lados leem as
  mensagens"`). Só quem participa pode inserir, e só como si mesmo
  (`"so participante envia mensagem"`, `sender_id = auth.uid()`). Marcar
  como lida é só de quem RECEBEU, nunca de quem enviou (`"destinatario
  marca como lida"`, `sender_id <> auth.uid()` no `using` e no `with
  check`). Não existe policy de DELETE — mensagem não se apaga.

## Roteiro (rodar localmente, com `supabase start`)

Precisa de três contas de teste: **A** (cliente), **B** (profissional,
dono de um `worker_profiles` ativo) e **C** (qualquer outra conta, sem
relação nenhuma com a conversa de A e B).

1. Como **A**, chamar `abrirOuEncontrarConversa` (ou inserir direto via
   `supabase.from('conversations').insert(...)`) para o `worker_profile_id`
   de B. Confirmar que a linha é criada com `client_id = A`.
2. Repetir o mesmo insert como A: confirmar que NÃO cria uma segunda
   linha (a UNIQUE `conversa_unica_por_par` + o fallback de
   `abrirOuEncontrarConversa` devolvem a mesma conversa).
3. Como **A**, tentar inserir uma conversa com `client_id = B` (se
   passando por B). Esperado: **rejeitado** pela policy `"cliente abre a
   conversa"` (`client_id = auth.uid()`).
4. Como **A**, enviar uma mensagem nessa conversa (`enviarMensagem`).
   Esperado: sucesso.
5. Como **A**, tentar inserir uma mensagem com `sender_id = B` (se
   passando por B na própria conversa). Esperado: **rejeitado** pela
   policy `"so participante envia mensagem"`.
6. Como **B**, ler a conversa e as mensagens (`buscarConversa`,
   `listarMensagens`). Esperado: sucesso, vê a mensagem de A.
7. Como **C** (sem nenhuma relação com a conversa), tentar:
   - `select` na conversa de A/B pelo id — esperado: **zero linhas**
     (não erro; RLS filtra silenciosamente, é assim que o PostgREST
     funciona — `buscarConversa` trata isso como "não encontrada").
   - `select` nas mensagens dessa conversa — esperado: **zero linhas**.
   - `insert` uma mensagem nessa conversa, mesmo com `sender_id = C` —
     esperado: **rejeitado** (C não passa em `participa_da_conversa`).
   Este é o teste que mais importa: prova que um terceiro não lê nem
   escreve numa conversa alheia.
8. Como **B**, marcar como lida uma mensagem que A enviou
   (`marcarConversaComoLida`). Esperado: sucesso, `read_at` preenchido.
9. Como **A**, tentar marcar como lida a própria mensagem que A mesma
   enviou (chamando o update direto, ignorando o filtro de
   `marcarConversaComoLida`, que já evita isso client-side). Esperado:
   **rejeitado** pela policy `"destinatario marca como lida"`
   (`sender_id <> auth.uid()`).
10. Como **A** ou **B**, tentar `delete` numa mensagem. Esperado:
    **rejeitado** — não existe policy de delete pra `messages`.

## Se algum passo falhar

Qualquer resultado diferente do "esperado" acima é bloqueante pro merge
desta epic — não é um ajuste cosmético, é a garantia central de
privacidade do chat. Reportar qual passo falhou e o que voltou, pra
corrigir a migration antes de mesclar em `develop`.
