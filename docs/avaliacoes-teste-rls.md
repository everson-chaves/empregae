# Teste manual de RLS das avaliações (E06)

## Por que manual, e não um teste automatizado rodando aqui

Mesma situação do chat e da contratação (`docs/chat-teste-rls.md`,
`docs/contratacao-teste-rls.md`): este ambiente não tem Supabase local
(Docker) disponível. A trava de `reviews` é mais antiga que esta epic — o
schema (`booking_id` `NOT NULL` + `UNIQUE` + `on delete restrict`) é da
T00.2 e a RLS (`pode_avaliar`) é da T00.4 (`supabase/migrations/20260911100000_rls.sql`)
— esta epic não mudou nenhuma das duas. O que mudou foi a aplicação
(`src/lib/avaliacoes.ts`) e duas RPCs novas (`denunciar_avaliacao`,
`estatisticas_avaliacoes`, `listar_avaliacoes_profissional`). Este roteiro
prova as duas coisas contra um Postgres de verdade antes do merge: que a
trava estrutural continua valendo (T06.1) e que as RPCs novas se comportam
como esperado.

## O que a RLS promete (T06.1)

- **`reviews`**: select é público (`"avaliacoes sao publicas"`). Insert só
  é permitido quando `autor_id = auth.uid()` **e** `pode_avaliar(booking_id)`
  — que por sua vez exige que o booking exista, esteja `concluido`, **e**
  que quem chama seja o `client_id` daquela conversa. Sem essas três
  condições simultâneas não existe INSERT possível, não importa o que a
  aplicação tente mandar. Não há UPDATE nem DELETE liberados pro usuário
  comum — só `"admin modera avaliacoes"` (update, só admin) e a RPC
  `denunciar_avaliacao` (que só mexe em `denunciada`).

## Roteiro (rodar localmente, com `supabase start`)

Precisa de uma conversa com contratação já `concluída` entre **A**
(cliente) e **B** (profissional) — reusar o roteiro de
`docs/contratacao-teste-rls.md` até o passo 6 (conclusão dos dois lados) —
e uma terceira conta **C** sem relação com ela.

1. Como **A**, chamar `avaliarContratacao` para o booking concluído, nota
   5. Esperado: sucesso — `reviews.autor_id = A`, `booking_id` do booking
      concluído.
2. Como **A** de novo, tentar avaliar a MESMA contratação outra vez.
   Esperado: **rejeitado** — `reviews_booking_id_key` (UNIQUE em
   `booking_id`), traduzido por `erros.ts` como "Esta contratação já foi
   avaliada."
3. Como **B** (o profissional, não o cliente), tentar avaliar a mesma
   contratação ou qualquer outra em que ele é o lado profissional.
   Esperado: **rejeitado pela RLS** — `pode_avaliar` exige
   `c.client_id = auth.uid()`, e B não é o cliente de nenhuma conversa sua
   própria.
4. Como **C** (sem relação com a conversa), tentar avaliar o mesmo
   booking. Esperado: **rejeitado pela RLS** — mesma razão do passo 3
   (C não é `client_id` daquela conversa) e adicionalmente `autor_id` não
   bateria com `auth.uid()` se C tentasse se passar por A.
5. Propor uma segunda contratação entre A e B, e tentar avaliar ENQUANTO
   ela ainda está `proposto` ou `aceito` (antes de concluir). Esperado:
   **rejeitado pela RLS** — `pode_avaliar` exige `status = 'concluido'`.
6. Como **A**, chamar `denunciarAvaliacao` na review do passo 1. Esperado:
   sucesso, `denunciada = true`. Repetir a chamada: esperado sucesso de
   novo (idempotente), sem erro e sem efeito colateral.
7. Como **C** (não logado — sem sessão), tentar chamar a RPC
   `denunciar_avaliacao` diretamente. Esperado: **rejeitado** — a função
   só tem `grant execute` para `authenticated`, não para `anon`.
8. Como **qualquer pessoa, incluindo sem login** (`anon`), chamar
   `buscarEstatisticasAvaliacoes` e `listarAvaliacoesProfissional` para o
   worker_profile de B. Esperado: sucesso nos dois — as duas RPCs têm
   `grant execute` para `anon` e `authenticated`, e devolvem o mesmo
   resultado independente de quem pergunta (reputação é pública, T06.3).
9. Repetir o passo 8 depois de denunciar a única review existente (passo
   6). Esperado: a review denunciada **continua aparecendo** na lista e
   entrando na média — `denunciada = true` não remove nem oculta nada
   sozinho; quem decide ocultar é a moderação do admin (T09.3, Mês 4,
   ainda não implementada). Confirma que T06.5 é só "marcar para
   moderação", não "remover".

## Se algum passo falhar

Qualquer resultado diferente do "esperado" acima é bloqueante pro merge
desta epic. Os passos 1–5 testam a trava estrutural que já existia (T06.1)
— se algum deles falhar, o bug está nas migrations da T00.2/T00.4, não
nesta epic. Os passos 6–9 testam código novo desta epic (RPCs e policies
de grant) — um resultado inesperado aí aponta pra migration
`20261103120100_avaliacoes_moderacao_lembrete_e_estatisticas.sql`.
