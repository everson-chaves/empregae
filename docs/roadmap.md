# Roadmap

## Estado atual

Protótipo web funcional em vanilla JS, com persistência em `localStorage` e dados simulados. Serve para demonstrar o fluxo, mas não sustenta operação real: não há usuários, não há backend, e várias telas exibem números fixos no código.

Este roadmap descreve a construção da v1 — a versão que roda o piloto.

## Os 6 meses do TCC

Duas frentes em paralelo. A frente de campo não espera o produto ficar pronto: entrevista de validação não precisa de software, e é ela que calibra as premissas do modelo financeiro.

| Mês | Produto | Campo e negócio |
|---|---|---|
| **1** | Supabase, schema, RLS, login por telefone, migração do front para React | 15 entrevistas com profissionais; escolha da praça; cotação de verificação |
| **2** | Perfis persistidos, busca geográfica real com PostGIS, geocoding | Mapeamento da oferta na praça; validação do preço de impulsionamento |
| **3** | Chat em tempo real, notificações por e-mail e push | Recrutamento dos primeiros 30 profissionais, com cadastro assistido |
| **4** | Registro de contratação, avaliações verificadas, painel admin | **Piloto no ar.** Captação de demanda; abordagem a 5 condomínios |
| **5** | Impulsionamento pago com Pix | Operação, medição, entrevistas com quem usou |
| **6** | Ajustes e estabilização | Consolidação de métricas; deck e preparação da defesa |

**O piloto entra no ar no mês 4, não no 6.** São necessários dois meses de operação real para haver o que apresentar à banca.

## Escopo da v1

**Essencial:**

- Login por telefone com código (OTP)
- Perfil de profissional persistido, com foto, categorias, preço médio e raio de atendimento
- Busca geográfica real
- Chat em tempo real
- Registro de contratação — pedido, aceite, conclusão — **sem processar pagamento**
- Avaliações liberadas apenas após contratação concluída
- Verificação com selo, aprovada manualmente no piloto
- Notificações por e-mail e push
- Painel administrativo

**Se sobrar tempo:**

- Impulsionamento pago via Pix
- Painel de condomínio

**Deliberadamente fora:** agenda, pagamento do serviço, app nativo, recursos de IA.

## Por que não processar pagamento agora

Registrar a contratação sem mover dinheiro entrega quase todo o valor estratégico — avaliação verificada, volume transacionado mensurável, dados de recorrência — por uma fração do esforço de engenharia. Split de pagamento entra como item de roadmap na apresentação, o que demonstra planejamento em vez de lacuna.

## O que sai do protótipo atual

| Item | Motivo |
|---|---|
| Botão de WhatsApp | A conversa passa a acontecer na plataforma; sem isso não há registro |
| Plano de R$ 9,90/mês | Substituído por verificação e impulsionamento |
| "Melhorar com IA" | Hoje é concatenação de texto, não IA |
| Score de compatibilidade | Número inventado; precisão falsa destrói credibilidade sob questionamento |
| Agenda com horários fixos | Fora do escopo da v1 |
| Avaliações fixas no código | Reconstruídas com a trava de contratação concluída |

**Preservado:** todo o CSS, a estrutura de categorias, o cálculo de distância e o PWA.

## Depois do TCC

**Curto prazo**

- Integração de pagamento do serviço, com split
- Expansão para a segunda praça
- Automação da verificação via API do provedor
- App Android a partir do PWA, com Capacitor ou TWA

**Médio prazo**

- Painel para condomínios e administradoras em escala
- Agenda profissional
- Recuperação de perfil por IA, se justificada por uso real

**Longo prazo**

- Seguro de serviço
- Antecipação de recebíveis
- Ferramentas financeiras para a base de trabalhadores
