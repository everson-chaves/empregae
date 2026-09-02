# Setup de ambiente — Empregaê

Como cada integrante roda o projeto na própria máquina, e como os ambientes se separam.

Referente à task **T00.1** da epic **E00 — Fundação**.

---

## A arquitetura de ambientes

Somos 4 pessoas mexendo no mesmo banco ao mesmo tempo. Isso derruba a solução ingênua.

**A solução ingênua, e por que ela quebra:** criar um projeto Supabase na nuvem para "dev" e todo mundo apontar para ele. Com quatro pessoas rodando migrations diferentes na mesma base, a primeira pessoa que rodar `db:reset` apaga o trabalho das outras três, e duas migrations criadas no mesmo dia entram em conflito sem que ninguém perceba até o deploy.

**O que fazemos em vez disso:**

| Ambiente | Onde roda | Quem usa | Custo |
|---|---|---|---|
| **Local** | Docker, na sua máquina | Cada dev tem o seu | R$ 0, sem limite |
| **Produção** | Projeto hosteado no Supabase | O piloto, a partir do mês 4 | Free tier → Pro no mês 4 |

Cada dev tem um Postgres inteiro só seu, que sobe em um comando e reseta em segundos. Ninguém pisa no pé de ninguém, e o free tier da nuvem fica intacto para o que importa.

**Consequência prática:** você desenvolve e testa migration local. Ela só chega na produção via PR aprovado e `db:push`. Ninguém roda migration direto na nuvem pela interface do Supabase — se fizer isso, o histórico de migrations do repositório deixa de refletir o banco real e a próxima pessoa a rodar `db:push` derruba a alteração.

---

## Parte 1 — Criar o projeto hosteado

**Feito uma vez só, por uma pessoa.** Sugestão: quem for o dono da conta do repositório.

1. Criar conta em [supabase.com](https://supabase.com) (dá para entrar com o GitHub).
2. **New project**, dentro de uma organização com nome do grupo — não pessoal, para que a transferência depois não vire dor de cabeça.
3. Preencher:
   - **Name:** `empregae-prod`
   - **Database password:** gerar uma senha forte e guardar **no gerenciador de senhas do grupo**. Ela não aparece de novo depois. Não colar em conversa de WhatsApp nem em issue do GitHub.
   - **Region:** `South America (São Paulo)` — a latência importa para o chat em tempo real, e o público é todo brasileiro.
   - **Plan:** Free por enquanto. Subir para Pro no mês 4 (task T10.2), antes do piloto ir ao ar.
4. **Convidar os outros 3 integrantes** em Project Settings → Team. Todos com acesso, para ninguém ficar bloqueado esperando uma pessoa.

> ⚠️ **O projeto free pausa após ~1 semana sem atividade.** Enquanto estivermos só desenvolvendo local, isso é inofensivo — mas se pausar na véspera da defesa, a demo morre. Subir para Pro no mês 4 não é luxo, é seguro.

---

## Parte 2 — Rodar na sua máquina

**Cada integrante faz, uma vez.**

Pré-requisitos: [Node 20+](https://nodejs.org) e [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e **aberto**.

```bash
git clone https://github.com/everson-chaves/empregae.git
cd empregae
npm install
cp .env.example .env
npm run db:start
```

O `db:start` baixa as imagens do Postgres na primeira vez (alguns minutos, só uma vez) e no final imprime um bloco assim:

```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGciOi...
```

Copie a `anon key` para o seu `.env`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

O **Studio** em `http://127.0.0.1:54323` é o painel do seu banco local — dá para ver tabelas, rodar SQL e inspecionar as políticas de RLS.

### Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `npm run db:start` | Sobe o Supabase local |
| `npm run db:stop` | Derruba (libera memória da máquina) |
| `npm run db:status` | Mostra URLs e chaves de novo |
| `npm run db:reset` | **Apaga tudo**, reaplica todas as migrations e roda o seed |
| `npm run db:diff -- nome_da_mudanca` | Gera migration a partir do que você alterou no Studio |
| `npm run db:push` | Envia migrations para o projeto hosteado |

`db:reset` é o comando que você mais vai usar. Rode sempre que puxar migration nova de outra pessoa — é ele que garante que seu banco local está igual ao do repositório.

---

## Parte 3 — Segredos

O `.env` está no `.gitignore` e deve continuar assim.

**Nunca commitar, em nenhuma circunstância:**

- `service_role key` — ela **ignora toda a RLS**. Vazou, qualquer pessoa lê o telefone e o endereço exato de todos os profissionais cadastrados. Só existe dentro de Edge Function, via secret do Supabase.
- Senha do banco de produção
- Chaves dos provedores de e-mail, geocoding ou SMS

A `anon key` é diferente: ela é **pública por definição**, vai no bundle do frontend e não protege nada sozinha. Quem protege os dados é a RLS (task T00.4). Se a RLS estiver errada, a anon key basta para vazar o banco inteiro — por isso T00.4 exige teste com usuário não autorizado, e não só leitura do código.

> Se um segredo for commitado por acidente, **rotacione a chave**. Apagar o commit não resolve: o GitHub já distribuiu o histórico, e forks e clones locais continuam com ele.

---

## Onde as coisas ficam

```
supabase/
  config.toml        # configuração do ambiente local (versionada)
  migrations/        # o schema, em ordem cronológica (T00.2)
  seed.sql           # dados de desenvolvimento (T00.5)
.env.example         # template — versionado
.env                 # os seus valores — NUNCA versionado
```
