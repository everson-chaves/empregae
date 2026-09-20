# Recuperação de senha — T01.4

Referente à task **T01.4** da epic **E01 — Autenticação**. Complementa `docs/telefone-login.md` (T01.2), que já registrava esta pendência como risco conhecido.

## O fluxo por e-mail

Padrão do Supabase Auth: `EsqueciSenha.tsx` chama `auth.resetPasswordForEmail`, a pessoa recebe um link, `RedefinirSenha.tsx` (rota `/redefinir-senha`) valida que o link é um token de recuperação de verdade (`useRecuperacaoDeSenha`, em `src/lib/auth.ts` — escuta o evento `PASSWORD_RECOVERY` do GoTrue) e deixa escolher a senha nova.

`EsqueciSenha.tsx` nunca revela se o e-mail existe ou não na base — a mensagem de confirmação é a mesma ("se esse e-mail existir, enviamos um link") independente do resultado. Isso é comportamento padrão de segurança contra enumeração de contas, não uma escolha nova desta task.

## O caso do telefone — sem solução automática no MVP1

Quem se cadastrou por telefone (T01.2) tem um e-mail sintético (`tel-<numero>@telefone.empregae.invalid`) que **ninguém lê**. Não existe link de recuperação possível para esse endereço.

A alternativa de verdade seria OTP por SMS — e essa é exatamente a decisão de 21/08 que o MVP1 conscientemente deixa de fora (ver seção 1.2 do plano de execução): SMS é o único item pago estrutural da stack. Resolver a recuperação de senha por telefone corretamente significa pagar por SMS mais cedo do que o planejado — não faz sentido abrir essa exceção só para esta task.

**O que este PR faz em vez disso:** `EsqueciSenha.tsx` detecta telefone (`pareceTelefone`, o mesmo helper do login) **antes** de qualquer chamada de rede, e mostra a limitação de forma honesta, sem fingir que o link foi enviado. Ninguém fica esperando um e-mail que nunca chega.

### Runbook manual — telefone esqueceu a senha

Até o SMS entrar (pós-piloto), quem cadastrou por telefone e esqueceu a senha precisa de ajuda manual de alguém com acesso ao painel do Supabase:

1. Achar o telefone normalizado da pessoa (mesmo formato de `profiles.telefone`: só dígitos, DDD + número, sem `+55`).
2. No painel do Supabase → Authentication → Users, buscar por `tel-<telefone>@telefone.empregae.invalid`.
3. Usar a opção de definir uma senha nova diretamente pelo painel (ou `supabase.auth.admin.updateUserById(id, { password })` via service role, fora do cliente do app) e passar a senha nova para a pessoa por um canal que não seja o e-mail sintético — telefone, WhatsApp, o que for.
4. Orientar a pessoa a trocar a senha de novo assim que puder (não há tela de "trocar senha logado" ainda — fica como possível task futura, não coberta aqui).

Isto é trabalho manual e não escala — mesma lógica já aceita para a verificação de documento (E07: "no piloto o processo é manual nas duas pontas"). Com a base pequena do piloto (T10.5: ~30 profissionais), é um custo operacional aceitável.

## O que muda quando o OTP por SMS entrar

Segundo `docs/telefone-login.md`, migrar para OTP não exige mexer em schema nem em dados já gravados. Quando isso acontecer, a recuperação por telefone deixa de precisar do runbook manual: o mesmo SMS de verificação de login pode carregar um código de recuperação, e `EsqueciSenha.tsx` troca a branch de "mostrar limitação" por uma chamada real.
