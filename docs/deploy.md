# Deploy

Referente à task **T00.8** da epic **E00 — Fundação**.

---

## O que roda automático hoje

**CI (`.github/workflows/ci.yml`)** — dispara em todo pull request e em todo push na `main`. Dois jobs:

| Job | O que verifica |
|---|---|
| **Lint, tipos e build** | `oxlint`, `tsc --noEmit` e o build de produção |
| **Migrations e seed** | Aplica todas as migrations do zero, roda o seed duas vezes, confere que ele populou, que nenhuma tabela ficou sem RLS e que os tipos do TypeScript batem com o schema |

O segundo job é o que mais vale para este projeto. Com quatro pessoas criando migration em paralelo, o erro mais provável é uma migration que funciona na máquina de quem escreveu — porque lá o banco tem um estado que o das outras pessoas não tem. O CI aplica tudo em banco vazio e pega isso antes do merge.

A checagem de RLS existe pelo mesmo motivo: tabela em `public` sem RLS é legível pela anon key, que vai no bundle do frontend. É um erro fácil de cometer numa migration e difícil de notar numa revisão de código.

---

## Deploy: o que falta configurar

**Ainda não está configurado.** Exige conta e acesso ao repositório, então é passo de vocês.

### Por que não há workflow de deploy

Daria para escrever um workflow que faz o deploy, mas isso exigiria guardar tokens como secrets do repositório e reimplementar à mão o que a integração já faz. A integração pelo painel da Vercel dá **preview automático por pull request** de graça, sem nenhum arquivo de workflow — que é exatamente a subtask "preview automático por PR".

O `vercel.json` já está no repositório com o build, o rewrite de SPA e os cabeçalhos de cache.

### Passo a passo (uma pessoa, uma vez)

1. Criar conta em [vercel.com](https://vercel.com) com o GitHub.
2. **Add New → Project**, escolher `everson-chaves/empregae`.
3. A Vercel lê o `vercel.json` e configura build e diretório sozinha. Não mexer.
4. Em **Environment Variables**, definir para *Production*:
   - `VITE_SUPABASE_URL` — do projeto hosteado
   - `VITE_SUPABASE_ANON_KEY` — idem
5. Deploy.

A partir daí: push na `main` publica em produção, e todo pull request ganha uma URL de preview própria, comentada automaticamente no PR.

### ⚠️ Uma armadilha do preview

Por padrão, o preview de cada PR usa as **mesmas variáveis de produção**. Isso significa que testar um PR grava no banco de produção — e a partir do mês 4 esse banco tem profissional de verdade cadastrado.

Antes do piloto ir ao ar, escolher um destes:

- **Criar um segundo projeto Supabase** (o free tier permite dois) e apontar as variáveis de *Preview* para ele. É a opção limpa.
- **Aceitar conscientemente** enquanto o banco só tem dado de seed, e revisar na T10.2, quando a produção sobe para o plano Pro.

Enquanto ninguém real está cadastrado, não há problema. O problema aparece depois, e em silêncio.

---

## O rewrite de SPA

O `vercel.json` manda toda rota desconhecida para o `index.html`. Sem isso, abrir `https://empregae.com.br/conversas` direto no navegador — ou simplesmente recarregar a página — daria 404, porque esse caminho não existe como arquivo: quem resolve a rota é o React Router, no cliente.

A regra exclui `assets/`, `sw.js`, `workbox-*`, `registerSW.js` e o manifesto. Esses precisam ser servidos como arquivo de verdade; se caíssem no rewrite, o navegador receberia HTML no lugar do service worker e o PWA quebraria.

---

## Cabeçalhos de cache

| Caminho | Política | Motivo |
|---|---|---|
| `/assets/*` | 1 ano, imutável | Os nomes têm hash do conteúdo: mudou o arquivo, mudou o nome |
| `/sw.js` | sem cache | O navegador precisa buscar o service worker novo para o app atualizar. Com cache, a atualização pode demorar dias a chegar |
