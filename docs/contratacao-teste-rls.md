# Teste manual de RLS da contratação (E05)

## Por que manual, e não um teste automatizado rodando aqui

Mesma situação do chat (`docs/chat-teste-rls.md`): este ambiente não tem
Supabase local (Docker) disponível. As policies de `bookings` já existiam
desde a T00.4 (`supabase/migrations/20260911100000_rls.sql`) e não mudaram
nesta epic — o que mudou foi a aplicação (`src/lib/contratacao.ts`), que
depende inteiramente delas para impedir que um lado force uma transição de
status que não é dele. Este roteiro prova isso contra um Postgres de
verdade antes do merge.

## O que a RLS promete

- **`bookings`**: só os dois lados da conversa veem a contratação (`"so os
  dois lados veem a contratacao"`, via `participa_da_conversa`) ou um
  admin. Só participante propõe (`"participante propoe contratacao"`) e só
  participante atualiza (`"participante atualiza a contratacao"`) — a RLS
  não distingue QUAL dos dois lados pode fazer QUAL transição de status;
  essa regra é inteiramente da aplicação (`contratacao.ts`), e é isso que
  este roteiro valida na prática.

## Roteiro (rodar localmente, com `supabase start`)

Precisa de uma conversa existente entre **A** (cliente) e **B**
(profissional), e uma terceira conta **C** sem relação com ela (reusar o
roteiro do chat para montar o cenário).

1. Como **A**, propor uma contratação (`proporContratacao`). Esperado:
   sucesso, `status = 'proposto'`, `proposto_por = A`.
2. Como **A** de novo, tentar propor outra enquanto a primeira segue
   `proposto`. Esperado: **rejeitado pela aplicação**
   (`buscarContratacaoEmAberto` encontra a primeira e `proporContratacao`
   lança antes de tentar o insert) — não é RLS, é regra de produto.
3. Como **B**, aceitar (`aceitarContratacao`). Esperado: sucesso, `status
   = 'aceito'`.
4. Como **C** (sem relação com a conversa), tentar `select` na
   contratação pelo id, e tentar `update` de status. Esperado: **zero
   linhas** no select, e o update não afeta nenhuma linha (RLS filtra
   silenciosamente — é o motivo de `contratacao.ts` usar sempre
   `exigirLinha`, nunca confiar em "sem erro = sucesso").
5. Como **A**, confirmar conclusão (`confirmarConclusao`). Esperado:
   sucesso, grava `confirmado_cliente_em`, status continua `aceito`
   (falta o outro lado).
6. Como **B**, confirmar conclusão. Esperado: sucesso, e esta chamada
   fecha: `status = 'concluido'`, `concluido_em` preenchido,
   `concluido_por = B`.
7. Como **A** ou **B**, tentar `confirmarConclusao` de novo na mesma
   contratação. Esperado: **rejeitado pela aplicação** (`atual.status !==
   'aceito'`).
8. Repetir os passos 1 e 3 numa contratação nova; depois, como **A**,
   cancelar com `recusarOuCancelarContratacao` enquanto está `aceito`.
   Esperado: sucesso, `status = 'cancelado'`, `cancelado_por = A`.
9. Como **A** ou **B**, tentar cancelar uma contratação já `concluido` ou
   já `cancelado`. Esperado: **rejeitado pela aplicação** (o filtro
   `.eq('status', statusAtual)` não encontra linha, e o guard de
   `statusAtual` antes da chamada já barra o caso óbvio).
10. Repetir o passo 1 (nova proposta); como **B**, "recusar" chamando
    `recusarOuCancelarContratacao` com `statusAtual: 'proposto'`.
    Esperado: sucesso, `status = 'cancelado'`, `cancelado_por = B` —
    confirma que recusar antes de aceitar usa o mesmo caminho de cancelar
    depois de aceito, só que a partir de `proposto`.

## Se algum passo falhar

Qualquer resultado diferente do "esperado" acima é bloqueante pro merge
desta epic. A maior parte das regras aqui é de aplicação, não de RLS — se
um passo "rejeitado pela aplicação" passar mesmo assim, o bug está em
`contratacao.ts`, não na migration.
