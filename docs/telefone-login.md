# Telefone como login — T01.2

Referente à task **T01.2** da epic **E01 — Autenticação**. Contexto completo da decisão em `docs/superpowers/specs/2026-08-21-empregae-mvp1-plano-execucao.md` (seção 1.2).

## O problema

O público do Empregaê tem mais hábito de telefone do que de e-mail. O MVP1 decidiu (21/08) autenticar por e-mail e senha — sem OTP por SMS, que é pago e é o único item estrutural que quebraria o custo zero até o piloto. Essa decisão contraria o hábito real do público, e a contradição é assumida conscientemente.

## A mitigação: telefone como identificador, sem SMS

A pessoa cadastra e loga com o número que sabe de cor, mas **não há verificação nenhuma de que o número é dela** — é o mesmo nível de confiança que já existe no login por e-mail sem clique de confirmação. Continua sendo só usuário + senha; o telefone é só *qual* identificador em vez de *como* ele é verificado.

### Como funciona

O Supabase Auth (GoTrue) só entende e-mail como identificador — não há como ensinar ele a aceitar telefone nativamente sem mexer em algo fora do nosso controle. Em vez disso:

1. O telefone digitado é normalizado (`src/lib/telefone.ts#normalizarTelefone`) para o mesmo formato salvo em `profiles.telefone` — só dígitos, DDD + número, sem `+55`.
2. Esse telefone normalizado vira um **e-mail sintético**: `tel-<telefone>@telefone.empregae.invalid` (`src/lib/auth.ts#telefoneParaEmailSintetico`). `.invalid` é o TLD que a RFC 2606 reserva para domínio que nunca deve resolver — não existe risco de colidir com domínio real nem de alguém conseguir mandar e-mail pra lá.
3. Esse e-mail sintético é o que vai para `auth.signUp`/`auth.signInWithPassword`. O GoTrue nunca sabe que "telefone" existe — pra ele é só mais um e-mail.
4. O telefone de verdade vai como metadata do signup (`options.data.telefone`) e o trigger da T01.5 (`criar_profile_no_signup`) grava em `profiles.telefone` — a mesma coluna que já existia desde a T00.2, com o mesmo `check` de formato.
5. No login, o campo único (`src/pages/Entrar.tsx`) decide se o que a pessoa digitou parece e-mail ou telefone (`telefone.ts#pareceTelefone`) e monta o e-mail sintético do mesmo jeito, se for o caso.

### A pegadinha que isso cria: confirmação de e-mail

`enable_confirmations` é uma configuração **do projeto inteiro**, não por usuário. Um e-mail sintético nunca vai receber o link de confirmação — se essa opção estiver ligada, quem se cadastra por telefone fica com uma conta permanentemente não confirmada, sem forma de resolver sozinho.

Por isso, **`enable_confirmations` precisa continuar desligado** (`supabase/config.toml` local e o painel do projeto hosteado) enquanto o cadastro por telefone existir do jeito que está. Isso já é o caso hoje — é a mesma configuração que permite o cadastro por e-mail sem confirmação no MVP1. Quem for religar confirmação de e-mail no futuro (para os cadastros por e-mail) precisa antes resolver isto, não só desligar a flag.

## Migração futura para OTP por SMS

Quando o orçamento permitir OTP de verdade (fora do escopo do MVP1 — ver seção "Fora, conscientemente" do plano de execução), a migração **não exige mexer no schema nem nos dados já gravados**:

- `profiles.telefone` já é a fonte de verdade do telefone da pessoa — continua sendo.
- O e-mail sintético em `auth.users.email` pode continuar existindo como está; ele é só a chave interna do GoTrue, nunca aparece pra ninguém.
- O que muda é *quando* a confiança é estabelecida: em vez de "confiar na senha", adiciona-se um passo de verificação por SMS antes (ou depois) do primeiro login — como uma camada por cima, não como troca de identificador.
- Contas antigas (cadastradas sem verificação) podem ser migradas gradualmente pedindo a verificação na próxima vez que logarem, sem precisar de um script de migração em massa nem de derrubar sessões existentes.

Ou seja: a decisão de 21/08 não é uma dívida técnica que precisa ser desfeita depois — é uma camada a menos que se liga por cima quando fizer sentido financeiro.
