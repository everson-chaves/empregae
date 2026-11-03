# Convenções de trabalho — T00.10

Referente à task **T00.10** da epic **E00 — Fundação**. Registra o que já está em uso de fato (extraído do histórico real do repo) e propõe o que ainda depende de decisão do grupo.

## Padrão de branch

Formato: `<tipo>/<epic-ou-assunto>` ou `<tipo>/<epic>-<task-slug>` quando a branch cobre uma task específica dentro de uma epic maior.

`<tipo>` é um dos:

- `feat` — código novo (uma epic ou task): `feat/e00-fundacao`, `feat/e01-auth-login`, `feat/e01-t01.2-telefone-login`
- `docs` — documentação, sem mudança de comportamento: `docs/t00.9-custos-provedores`
- `fix` — correção de bug

Já em uso desde o E00 e o E01; este documento só formaliza.

## Padrão de commit

Duas formas convivem no histórico, cada uma com seu lugar:

**Commit de task, no formato `T<epic>.<task>: descrição curta`:**

```
T01.2: telefone como identificador de login
T00.1: estrutura de ambientes Supabase, env template e doc de setup
```

Use este formato para o commit principal que entrega uma task inteira — a descrição em texto livre, sem jargão de conventional commits.

**Commit convencional, no formato `tipo(escopo): descrição`:**

```
fix(seed): upsert em profiles em vez de insert puro
docs(T00.9): confirmar custos e provedores em fonte ao vivo
```

Use este formato para commits menores dentro de uma branch — correções, ajustes, documentação pontual — que não são "a entrega" da task, só um passo dela.

Mensagem sempre em português, sem prefixo de ticket redundante além do que já está no formato acima (não precisa repetir `#23` na mensagem — a issue já é referenciada no corpo do PR via `Closes #N`).

## Template de PR

Criado em `.github/PULL_REQUEST_TEMPLATE.md` (ver arquivo) — baseado na estrutura que os PRs #80 e #81 já vinham usando informalmente: contexto/dependências, o que mudou em bullets, o que foi testado, e o `Closes #N` no fim.

## Proteção da branch main — proposta, não aplicada

Isto é uma configuração do repositório no GitHub (Settings → Branches), não um arquivo — por isso fica registrado aqui como proposta para o grupo confirmar, em vez de já vir aplicado.

Contexto: `main` já fica protegida por convenção (só recebe merge no go-live do piloto — ver `docs/*` e as decisões de 21/08); os PRs de verdade vão para `develop`. Proposta de regra para quando alguém for configurar:

- **Branch a proteger agora:** `develop` (é nela que os PRs realmente pousam) — regra sugerida: exigir 1 aprovação antes do merge, exigir que os checks de CI passem, sem push direto.
- **Branch a proteger antes do go-live (T10.2):** `main` — mesma regra, e travar até a semana do piloto.

Alguém do grupo com acesso de admin no repo precisa aplicar isso em Settings → Branches → Branch protection rules. Não foi configurado aqui.

## Quem revisa o PR de quem — proposta, não aplicada

O que já é fato, pelo histórico de PRs: **Larissa (LarissaCancella) revisa os PRs da trilha Dev A** (Everson, E01 + E07).

O que falta para fechar isto de verdade: os nomes reais de quem está nas trilhas Dev B, Dev C e Dev D (a seção 4 do spec de execução só usa os apelidos das trilhas, não define quem revisa quem entre elas). Proposta simples para o grupo confirmar:

| Trilha | Quem revisa |
|---|---|
| Dev A (Everson) | Larissa |
| Dev B | — a definir |
| Dev C | — a definir |
| Dev D | — a definir |

Sugestão de regra geral, para não depender de decidir par a par: **ninguém aprova o próprio PR** e, sempre que possível, **quem revisa é quem depende do que está sendo entregue** (ex.: quem faz Chat/E04 revisa Perfis/E02, porque Chat depende do schema que Perfis usa) — isso também funciona como revisão de integração, não só de estilo. Fica como proposta; confirmação final é do grupo.
