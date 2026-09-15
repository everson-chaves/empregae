# Empregaê — Plano de Negócio e Arquitetura da v1

**Data:** 2026-08-07
**Contexto:** TCC de MBA, grupo de 4 pessoas, ~6 meses até a entrega e a competição de startups.
**Situação inicial:** protótipo web funcional em vanilla JS com persistência em `localStorage`, sem backend.

Este documento consolida as decisões estratégicas e técnicas. Ele é a fonte a partir da qual se deriva tanto o plano de negócio entregue à banca quanto o plano de implementação.

---

## 1. Decisões estratégicas e o raciocínio por trás delas

Registro aqui não só o *que* foi decidido, mas *por quê* — a banca vai perguntar, e a defesa oral fica muito mais forte com o raciocínio à mão.

### 1.1 Sem taxa sobre a transação

**Decisão:** a plataforma não cobra percentual sobre o serviço contratado.

**Motivo:** serviços locais têm alta recorrência entre o *mesmo par* de pessoas. Uma diarista que vai à mesma casa toda semana e a plataforma cobrando a cada visita — os dois lados combinam por fora no segundo mês. O vazamento não é risco, é certeza. A Thumbtack, nos EUA, migrou de comissão exatamente por isso.

**Consequência:** a receita precisa vir de algo que **não pode ser feito por fora**.

### 1.2 Monetizar a descoberta, não a transação

**Decisão:** receita vem de visibilidade, credencial e acesso — não do dinheiro que troca de mãos.

**Motivo:** não existe "combinar por fora" um lugar na listagem nem um selo de verificação. São produtos imunes a desintermediação. É o modelo de classificados (OLX, Mercado Livre Clasificados), e ele funciona porque o momento da necessidade **se repete com prestadores diferentes**: quem procura diarista hoje procura eletricista em três meses.

### 1.3 Cobrança variável, nunca assinatura fixa do trabalhador

**Decisão:** o profissional paga por período de impulsionamento, quando quiser, e por verificação anual. Nunca mensalidade obrigatória.

**Motivo:** o problema do modelo original (R$ 9,90/mês) não era cobrar do trabalhador — era cobrar **valor fixo de quem tem renda volátil**. Isso gera churn alto e é o que transformou a GetNinjas em caso de reclamação de profissional no Brasil. Cobrança avulsa se autorregula: quem está com agenda cheia não compra; quem está sem trabalho compra.

**Frase-núcleo do pitch:** *o trabalhador nunca paga para trabalhar, só para aparecer — e só quando quiser.*

### 1.4 Selo verificado deixa de ser produto de vitrine

**Decisão:** o selo passa a exigir checagem real (documento + antecedentes). Deixa de ser um item do plano pago de prioridade visual.

**Motivo:** vender sinal de confiança sem checagem por trás é frágil na apresentação e arriscado de verdade — especialmente em cuidado de idosos, onde o selo pode ser a razão de alguém deixar um estranho sozinho com um familiar vulnerável. Cobrar pela verificação é honesto porque a consulta custa dinheiro real.

### 1.5 Produto nacional, operação concentrada

**Decisão:** cadastro aberto para qualquer cidade do Brasil desde o dia um. Divulgação, cadastro assistido e mídia paga em **uma única praça**.

**Motivo:** valor de marketplace é local. Um cliente em Recife não ganha nada com um eletricista em Porto Alegre — alcance nacional não agrega valor a nenhum usuário individual, só dilui a densidade de todos. Com ~100 profissionais espalhados em 20 cidades, toda busca com raio de 5 km devolve tela vazia e nenhum usuário volta. Os mesmos 100 concentrados devolvem 10–12 resultados por busca, e aí acontece contratação, avaliação e boca a boca — que também é geográfico.

**Nota para o pitch:** manter o cadastro aberto tem custo zero e gera sinal útil — cadastros orgânicos fora da praça indicam onde expandir depois.

### 1.6 Chat interno como canal único

**Decisão:** a conversa acontece dentro da plataforma. O botão de WhatsApp sai do perfil. Notificação de mensagem nova chega por **e-mail e push do PWA** (não pela API do WhatsApp, que tem custo e burocracia de aprovação).

**Motivo:** sem registro da conversa não há avaliação verificável, não há dado de conversão e não há GMV para mostrar. Com o botão de WhatsApp presente, ninguém usa o chat interno.

**Realismo:** as pessoas vão trocar telefone no chat. **Não bloquear** — bloqueio de número é contornado trivialmente ("nove nove um dois") e só piora a experiência. O objetivo do chat não é prender ninguém; é registrar que a conversa existiu.

### 1.7 Produto horizontal

**Decisão:** todas as categorias de serviço, como na visão original.

**Motivo:** anúncio vive de volume e de recorrência de necessidade entre categorias diferentes. Verticalizar faria sentido com receita transacional; com receita de descoberta, horizontal é o formato coerente — é o motivo de a OLX ser horizontal.

---

## 2. Plano de negócio

### 2.1 Posicionamento

> **Empregaê é o classificado de serviços do bairro.** Não intermedia dinheiro, não cobra do trabalho — cobra de quem quer ser encontrado primeiro.

Posicionamento contra os substitutos atuais:

| Substituto | Falha que o Empregaê ataca |
|---|---|
| Grupos de WhatsApp de bairro/condomínio | Sem busca, sem reputação, sem verificação |
| GetNinjas | Cobra do profissional por lead que não converte; gera revolta da oferta |
| Boca a boca | Não escala, não tem memória, invisível para quem acabou de chegar no bairro |

### 2.2 As quatro camadas de receita

Prazos na coluna "Entra em" são contados **a partir do início da operação** (mês 4 do cronograma de desenvolvimento, quando o piloto vai ao ar) — não a partir do mês 1 do TCC.

| # | Camada | Preço sugerido | Margem bruta | Pré-requisito | Entra em |
|---|---|---|---|---|---|
| 1 | **Verificação** — antecedentes + selo com validade anual | R$ 39/ano | ~60% | Nenhum | Op. mês 1 |
| 2 | **Impulsionamento** — topo da busca no bairro, por período | R$ 7 / 7 dias · R$ 20 / 30 dias | ~95% | Densidade de demanda | Op. mês 6+ |
| 3 | **B2B condomínio** — pool verificado para moradores | R$ 250–400/mês | ~80% | Venda direta | Op. mês 3 |
| 4 | **Financeiro** — seguro de serviço, antecipação de recebíveis | Comissão / spread | — | Base instalada | Ano 3 |

Dentro dos 6 meses do TCC, portanto, só as camadas 1 e 2 chegam a ser exercitadas de fato; a 3 entra como contrato-piloto assinado e a 4 como visão de roadmap.

**A lógica que sustenta a defesa oral:** as camadas 1 e 3 **não dependem de tráfego** e por isso pagam a conta enquanto a liquidez não existe. A camada 2 é o motor que escala, mas só liga quando existe disputa por posição — ficar em primeiro entre quatro profissionais não vale nada. A camada 4 é o que faz a projeção de ano 3 crescer de forma crível; é o playbook que iFood e Mercado Livre já executaram no Brasil.

Antecipar essa sequência é o que separa "temos um modelo de receita" de "entendemos que modelos de receita têm pré-requisitos".

### 2.3 Unit economics

O modelo é construído com **premissas explicitamente rotuladas**. Banca de MBA avalia a consistência do raciocínio, não a precisão de números que ninguém pode ter ainda.

Premissas a validar em campo (trabalho das 3 pessoas que não programam):

| Premissa | Valor inicial | Como validar |
|---|---|---|
| Adesão à verificação entre profissionais ativos | 25% | Entrevista + teste de preço no piloto |
| Conversão para impulsionamento pago | 15% | Referências de classificados ficam entre 5% e 15% |
| Recompra de impulsionamento | 5x/ano | Medir no piloto |
| CAC do lado da demanda | **a medir** | Teste real de mídia paga geolocalizada |
| Custo unitário da consulta de antecedentes | R$ 15 | Cotar com IDwall, Serpro ou similar |

Receita anual por profissional ativo, ponderada pelas taxas de adesão:

```
Verificação:      R$ 39 × 25%  ≈  R$ 10
Impulsionamento:  R$ 20 × 5 × 15%  ≈  R$ 15
                                    --------
ARPU anual                       ≈  R$ 25
```

**Este ARPU é baixo, e isso é a verdade do negócio.** O modelo só fecha em volume alto ou com o B2B carregando a margem nos primeiros anos. É melhor vocês declararem isso na apresentação do que a banca descobrir na pergunta.

### 2.4 Mercado

Ordem de grandeza — **validar contra a PNAD Contínua mais recente antes de citar; nunca apresentar número sem fonte datada**:

- **TAM** — trabalhadores informais no Brasil, na casa das dezenas de milhões (taxa de informalidade historicamente perto de 38–40%)
- **SAM** — prestadores de serviço doméstico e reparos em regiões metropolitanas, com smartphone e disposição de usar app
- **SOM** — profissionais alcançáveis na região-piloto em 6 meses

### 2.5 Go-to-market

**Regra:** oferta primeiro, concentrada. Marketplace sem densidade não é produto, é banco de dados.

**Meta do piloto:** 80 a 120 profissionais na região-piloto, com pelo menos 30 dentro de um mesmo raio de 5 km.

**Critérios de escolha da praça** (a decidir pelo grupo):
- Densidade populacional
- Renda média compatível com contratação recorrente de serviços
- Presença de condomínios (alimenta a camada B2B)
- **Acesso real do grupo** — este é o critério que mais pesa na prática

**Canais de aquisição da oferta:**
- Grupos de WhatsApp de bairro e condomínio
- Associações de moradores, igrejas, lojas de material de construção
- Abordagem direta em feiras e comércio local
- **Cadastro assistido** — o grupo preenche o perfil pela pessoa, no celular dela

**Aquisição da demanda** — só depois de haver oferta: mídia paga geolocalizada, panfleto em condomínio, e o próprio contrato B2B.

### 2.6 Riscos

| Risco | Mitigação |
|---|---|
| **Vínculo empregatício** — cliente contrata a mesma diarista 3x/semana e ela pleiteia vínculo | Termos de uso claros; aviso no produto; a plataforma não define preço nem agenda nem exclusividade |
| **Segurança** — incidente envolvendo profissional com selo | Escopo da verificação declarado explicitamente; canal de denúncia; seguro (camada 4) |
| **Falta de liquidez** | Concentração geográfica; meta mínima de profissionais por raio antes de captar demanda |
| **LGPD** | Endereço sempre aproximado (bairro/cidade); telefone nunca exposto antes do match; consentimento explícito no cadastro |
| **Receita zero nos primeiros meses** | Camadas 1 e 3, que não dependem de tráfego |

### 2.7 Métricas de sucesso do piloto

O que precisa estar medido para a apresentação final:

- 80–120 profissionais cadastrados na praça; ≥30 num mesmo raio de 5 km
- ≥40% das buscas retornando 5 ou mais resultados *(métrica de liquidez — a mais importante)*
- ≥60 contratações registradas
- ≥25% de adesão à verificação
- ≥3 profissionais comprando impulsionamento espontaneamente
- Tempo mediano de primeira resposta no chat < 24h
- Nota média e número de avaliações verificadas

---

## 3. Produto

### 3.1 Cortes do protótipo atual

Boa parte do `app.js` é simulação convincente para demo, mas vira passivo num pitch: se um jurado clicar e perguntar de onde vem um número, a resposta não pode ser "está fixo no código".

| Item | Local | Decisão |
|---|---|---|
| Botão de WhatsApp | `app.js:477` | Cortar |
| Plano R$ 9,90 | `app.js:693` | Substituir por verificação + impulsionamento |
| "Melhorar com IA" | `app.js:630` | Cortar da v1 — é concatenação de string, não IA |
| `matchScore()` ("94% compatível") | `app.js:533` | Cortar — precisão inventada destrói credibilidade sob questionamento |
| `getAvailability()` — agenda fixa | `app.js:494` | Cortar da v1 |
| `getReviews()` — avaliações fixas | `app.js:525` | Reconstruir: só quem contratou avalia |
| Geocoding via `sampleLocations` | `app.js:54` | Substituir por geocoding real |
| Briefing por serviço (`bookingQuestions`) | `app.js:539` | **Manter, simplificado** — faz o cliente chegar no chat com o pedido estruturado |

**Preservar:** todo o CSS (1.172 linhas de trabalho real), a estrutura de categorias, a lógica de distância em `app.js:448`, e o PWA (manifest + service worker).

### 3.2 Escopo da v1

**Essencial** — sem isso o piloto não roda:

1. **Autenticação por telefone (OTP)** — o público não tem hábito de e-mail; telefone é o login natural. Custo de SMS é desprezível na escala do piloto
2. **Perfil de profissional persistido** — foto, categorias, descrição, preço médio, raio de atendimento
3. **Busca geográfica real** — PostGIS + geocoding de verdade
4. **Chat em tempo real** — o coração do produto
5. **Registro de contratação** — pedido → aceite → concluído, **sem processar pagamento**. É o que libera avaliação verificada e produz GMV mensurável
6. **Avaliações verificadas** — só após contratação concluída. **É o fosso competitivo do produto**
7. **Verificação com selo** — no piloto o processo é **manual em ambas as pontas**: o grupo faz a consulta de antecedentes avulsa no provedor contratado (fora do sistema) e registra a aprovação no painel admin. Cem profissionais dá para verificar na mão — custo de engenharia zero e resultado idêntico para o usuário. Integração automatizada com a API do provedor fica para depois do TCC
8. **Notificações** — e-mail + Web Push
9. **Painel admin** — moderação, fila de verificação, métricas

**Segunda onda**, se houver tempo:

10. Impulsionamento pago com Pix (Mercado Pago ou Asaas)
11. Painel de condomínio (camada B2B)

**Fora da v1**, conscientemente: agenda, pagamento do serviço, app nativo, IA.

### 3.3 A decisão de não processar pagamento na v1

Registrar a contratação sem mover dinheiro entrega ~80% do valor estratégico por ~40% do custo de engenharia: avaliações verificadas, GMV, dados de recorrência e retenção. Split de pagamento vira item de roadmap no pitch — o que soa como planejamento maduro, não como lacuna.

---

## 4. Arquitetura

### 4.1 Stack

**Supabase.** A escolha se justifica pelo encaixe direto com as necessidades deste projeto específico:

| Necessidade | O que o Supabase entrega |
|---|---|
| Busca por raio | Postgres **com PostGIS** — consulta geográfica nativa |
| Login do público-alvo | Auth por telefone (OTP) |
| Chat | **Realtime** via subscription de tabela |
| Fotos de perfil | Storage |
| Proteger dados sem escrever backend | **Row Level Security** — regra de acesso no banco |
| Lógica de servidor (webhook, e-mail) | Edge Functions |

**Frontend:** migração de vanilla JS para **React** (Vite). O `app.js` atual aguenta o que faz hoje, mas chat em tempo real, sessão e estado de conversas em vanilla vira emaranhado rápido. O CSS existente é reaproveitado quase integralmente.

**PWA mantido** — é o caminho mais barato para o app Android depois (Capacitor ou TWA).

**Serviços externos:**
- Geocoding: ViaCEP (CEP → endereço, gratuito) + Nominatim ou Mapbox (endereço → coordenadas)
- E-mail transacional: Resend ou SendGrid (free tier)
- Pagamento (segunda onda): Mercado Pago ou Asaas, via Pix

### 4.2 Módulos

Fronteiras desenhadas para que cada parte possa ser entendida e testada isoladamente:

```
auth          → cadastro, login OTP, sessão
profiles      → perfil do profissional, fotos, categorias
search        → consulta geográfica, filtros, ordenação (aplica boost)
chat          → conversas, mensagens, realtime
bookings      → pedido, aceite, conclusão
reviews       → avaliação com trava em booking concluído
verification  → documento, fila de aprovação, validade do selo
billing       → impulsionamento, pagamento, período ativo
notifications → e-mail + push
admin         → moderação, métricas
```

### 4.3 Modelo de dados

```
profiles                 -- estende auth.users
  id uuid PK             -- = auth.users.id
  nome, telefone, avatar_url
  tipo                   -- 'client' | 'worker' | 'both'
  created_at

categories
  id, slug, nome, icone

worker_profiles
  id uuid PK
  profile_id uuid FK -> profiles
  descricao
  preco_medio_centavos int
  unidade_preco          -- 'hora' | 'diaria' | 'servico'
  raio_atendimento_km int
  location geography(Point, 4326)   -- coordenada exata, NUNCA exposta ao cliente
  bairro, cidade, uf                -- endereço aproximado, este sim público
  ativo boolean
  verificado_ate date
  created_at

worker_categories
  worker_profile_id FK, category_id FK   -- PK composta

conversations
  id uuid PK
  client_id uuid FK -> profiles
  worker_profile_id uuid FK
  briefing jsonb          -- respostas do formulário estruturado
  created_at

messages
  id, conversation_id FK, sender_id FK
  body text, created_at, read_at

bookings
  id uuid PK
  conversation_id FK
  status                  -- 'proposto' | 'aceito' | 'concluido' | 'cancelado'
  valor_combinado_centavos int
  data_servico date
  concluido_em timestamptz, concluido_por uuid
  created_at

reviews
  id uuid PK
  booking_id uuid FK UNIQUE      -- trava estrutural: 1 avaliação por contratação
  autor_id uuid FK
  nota int CHECK (nota BETWEEN 1 AND 5)
  comentario text, created_at

verifications
  id, worker_profile_id FK
  status                  -- 'pendente' | 'aprovado' | 'reprovado'
  documento_url, tipo_documento
  revisado_por, revisado_em, validade date, observacao

boosts
  id, worker_profile_id FK
  inicio timestamptz, fim timestamptz
  valor_centavos, payment_id FK, status

payments
  id, profile_id FK
  tipo                    -- 'verificacao' | 'boost' | 'b2b'
  valor_centavos, provedor, provedor_id, status, pago_em
```

**Nota sobre `reviews.booking_id UNIQUE` com FK obrigatória:** é a trava estrutural que torna avaliação falsa impossível por construção, não por validação de aplicação. Sem contratação registrada, não existe linha de avaliação.

### 4.4 Consulta de busca

```sql
select w.*,
       ST_Distance(w.location, :origem) / 1000 as distancia_km,
       exists (
         select 1 from boosts b
         where b.worker_profile_id = w.id
           and now() between b.inicio and b.fim
           and b.status = 'ativo'
       ) as impulsionado
from worker_profiles w
where w.ativo
  and ST_DWithin(w.location, :origem, :raio_metros)
  and (:categoria is null or exists (
        select 1 from worker_categories wc
        where wc.worker_profile_id = w.id and wc.category_id = :categoria))
order by impulsionado desc, distancia_km asc;
```

### 4.5 Segurança e privacidade (RLS)

| Regra | Motivo |
|---|---|
| `messages` legível apenas pelos dois participantes da conversa | Privacidade básica |
| `profiles.telefone` nunca retornado na busca pública | LGPD — só após conversa iniciada |
| `worker_profiles.location` nunca retornada ao cliente; expor apenas `distancia_km` calculada no servidor | Não revelar onde a pessoa mora |
| `verifications.documento_url` acessível apenas a admin | Dado sensível |
| Escrita em `reviews` exige booking com `status = 'concluido'` | Integridade da reputação |

---

## 5. Cronograma — 6 meses, duas frentes em paralelo

| Mês | Produto (1 pessoa) | Campo e negócio (3 pessoas) |
|---|---|---|
| **1** | Supabase, schema, RLS, auth OTP, migração do front para React | 15 entrevistas com profissionais; escolha da praça; cotação de verificação |
| **2** | Perfis + busca geográfica real + geocoding | Mapear a oferta da praça; validar preço do impulsionamento |
| **3** | Chat realtime + notificações (e-mail e push) | Recrutar os primeiros 30 profissionais (cadastro assistido) |
| **4** | Contratação + avaliações verificadas + painel admin | **Piloto no ar**; captar demanda; abordar 5 condomínios |
| **5** | Impulsionamento + Pix | Operar, medir, entrevistar quem usou |
| **6** | Ajustes e estabilização | Consolidar métricas; montar deck e preparar defesa |

Dois pontos deliberados neste desenho:

- **O piloto começa no mês 4, não no 6.** São necessários dois meses de dados reais para haver o que apresentar.
- **O trabalho de campo do mês 1 não espera o produto.** Entrevista de validação não precisa de software, e é o que vai calibrar as premissas do modelo financeiro.

---

## 6. Questões em aberto

| Questão | Responsável | Prazo |
|---|---|---|
| Definição da região-piloto | Grupo | Mês 1 |
| Preço final da verificação (depende da cotação) | Frente de negócio | Mês 1 |
| Provedor de consulta de antecedentes | Frente de negócio | Mês 1 |
| Provedor de geocoding (Nominatim vs. Mapbox) | Produto | Mês 2 |
| Provedor de pagamento (Mercado Pago vs. Asaas) | Produto | Mês 4 |
