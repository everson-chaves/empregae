# Teste manual de RLS do painel admin (E09)

## Por que manual, e não um teste automatizado rodando aqui

Mesma situação do chat, da contratação e das avaliações
(`docs/chat-teste-rls.md`, `docs/contratacao-teste-rls.md`,
`docs/avaliacoes-teste-rls.md`): este ambiente não tem Supabase local
(Docker) disponível. A estrutura de admin (tabela `admins`, função
`eh_admin()`) já existia desde a T00.4
(`supabase/migrations/20260911100000_rls.sql`) — esta epic não mudou
nenhuma das duas, só passou a usá-las. O que esta epic acrescentou —
`admin_caminho_documento_verificacao`, `admin_fila_verificacao`,
`admin_denuncias_profissionais`, `admin_avaliacoes_denunciadas`,
`admin_metricas_piloto`, a policy "admin suspende ou reativa perfil" e a
coluna `reviews.oculta` — é o que este roteiro prova.

## O que a RLS e as funções prometem (T09.1)

- **`/admin` no app**: `useEhAdmin()` chama a RPC `eh_admin()` e redireciona
  para `/` quem não é admin. Isto é só UI — a trava de verdade é abaixo.
- **Toda função nova desta epic** (`admin_caminho_documento_verificacao`,
  `admin_fila_verificacao`, `admin_denuncias_profissionais`,
  `admin_avaliacoes_denunciadas`, `admin_metricas_piloto`) checa
  `eh_admin()` no próprio corpo e lança exceção se falso — elas são
  `SECURITY DEFINER` (rodam com privilégio de dono, ignoram RLS por
  natureza), então a checagem interna É a trava, não GRANT nem RLS.
- **`verifications` e `reviews`**: UPDATE só para quem `eh_admin()`
  (policies "admin decide a verificacao" e "admin modera avaliacoes",
  T00.4) — nenhuma função nova aqui, a app chama `update` direto.
- **`worker_profiles`**: a policy nova "admin suspende ou reativa perfil"
  (UPDATE) e "admin ve qualquer anuncio" (SELECT) só valem para quem
  `eh_admin()`.
- **`reviews.oculta`**: some da exibição pública
  (`estatisticas_avaliacoes`, `listar_avaliacoes_profissional`,
  `buscar_profissionais`, todas atualizadas nesta epic) assim que `true` —
  só o admin consegue mudar isto (mesma policy de UPDATE acima).

## Roteiro (rodar localmente, com `supabase start`)

Precisa de: uma conta **Z** sem linha em `admins` (usuário comum), uma
conta **ADM** com uma linha em `admins` (inserida à mão: `insert into
admins (profile_id) values ('<uuid de ADM>')` — a tabela não tem policy de
escrita de propósito, só service_role ou SQL direto insere, T00.4), uma
verificação pendente de algum profissional **P** (reusar o roteiro de
`docs/contratacao-teste-rls.md` para ter um profissional com anúncio, e o
fluxo de `Verificacao.tsx` para enviar o documento), e uma avaliação
denunciada (reusar o passo 6 de `docs/avaliacoes-teste-rls.md`).

1. Como **Z**, abrir `/admin`. Esperado: redirecionado para `/` —
   `useEhAdmin()` recebeu `false` de `eh_admin()`.
2. Como **Z**, chamar `supabase.rpc('admin_fila_verificacao')` direto
   (fora da UI, pelo console). Esperado: **erro** — "Apenas
   administradores veem a fila de verificação." Repetir para
   `admin_denuncias_profissionais`, `admin_avaliacoes_denunciadas` e
   `admin_metricas_piloto`: mesmo erro, cada uma com sua mensagem.
3. Como **Z**, chamar `admin_caminho_documento_verificacao` com o id da
   verificação de **P**. Esperado: **erro** — mesma razão do passo 2.
4. Como **Z**, tentar `update` direto em `verifications` (mudar status) ou
   em `reviews` (mudar `oculta`) ou em `worker_profiles` (mudar `ativo`
   de um perfil que não é seu). Esperado: nos três casos, **zero linhas
   afetadas** (RLS filtra, não lança erro em UPDATE — mesma armadilha
   documentada em `erros.ts#exigirLinha`).
5. Como **ADM**, abrir `/admin`. Esperado: painel carrega, as três abas
   (Métricas, Fila de verificação, Moderação) respondem.
6. Como **ADM**, na fila de verificação, clicar "Ver documento" na
   verificação de **P**. Esperado: abre o documento — a função devolveu o
   caminho e `createSignedUrl` funcionou (RLS de `storage.objects`,
   T07.1, já libera admin).
7. Como **ADM**, aprovar a verificação de **P** com uma validade no
   futuro. Esperado: `verifications.status = 'aprovado'`,
   **E** `worker_profiles.verificado_ate` de P igual à validade escolhida
   (o trigger `verifications_sincronizar_selo` propagou sozinho — sem
   isto o selo de T07.3 nunca apareceria).
8. Como **ADM**, na moderação, "Suspender perfil" do profissional
   denunciado. Esperado: `worker_profiles.ativo = false` — e a busca
   (`buscar_profissionais`) para de devolver este profissional
   imediatamente (ela já filtra `w.ativo`, T03.1).
9. Como **ADM**, "Ocultar" a avaliação denunciada. Esperado:
   `reviews.oculta = true` — e `listarAvaliacoesProfissional`/
   `buscarEstatisticasAvaliacoes` (chamadas por qualquer visitante, até
   `anon`) param de contar esta avaliação a partir da PRÓXIMA chamada,
   sem precisar reiniciar nada.
10. Como **qualquer um, incluindo `anon`**, chamar
    `buscarEstatisticasAvaliacoes`/`listarAvaliacoesProfissional` para o
    profissional do passo 9. Esperado: a avaliação ocultada não aparece
    e não entra na média — mas `denunciada` sozinha (sem `oculta`) nunca
    teria tido este efeito (prova que os dois campos são independentes,
    como a T06.5 já documentava).

## Se algum passo falhar

Passos 1–4 testam que a trava é real para quem não é admin — se algum
falhar, o bug está na checagem `eh_admin()` dentro da função nova, ou na
policy nova em `worker_profiles`, nunca em código de fora desta epic.
Passos 5–10 testam que o admin de fato consegue agir e que o efeito se
propaga para onde deveria (selo, busca, reputação pública) — um resultado
inesperado aqui aponta para a migration
`20261103130000_admin_painel.sql`.
