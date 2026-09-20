# Empregaê — Plano de Execução do MVP1

**Data:** 2026-08-21
**Deriva de:** `2026-08-07-empregae-plano-negocio-e-backend-design.md`
**Objetivo deste documento:** transformar o escopo da v1 em epics, tasks e subtasks executáveis, distribuídas entre 4 desenvolvedores, prontas para virar issues no board do GitHub.

Este documento **não substitui** o spec de 07/08 — ele o executa. Decisões de negócio, modelo de dados e justificativas continuam lá.

---

## 1. O que mudou desde o spec de 07/08

Três decisões novas, tomadas em 21/08, que contradizem premissas do documento anterior. Registradas aqui com o raciocínio, porque a banca vai perguntar.

### 1.1 Os 4 integrantes programam (antes: 1)

**Decisão:** todo o grupo escreve código no MVP1.

**Consequência direta e não-óbvia:** o spec de 07/08 alocava 3 pessoas ao trabalho de campo — 15 entrevistas, escolha da praça, recrutamento de 30 profissionais com cadastro assistido, abordagem a 5 condomínios. **Essas metas agora estão sem dono dedicado.** São exatamente as metas que produzem os números da apresentação final; sem elas o produto sobe e não tem ninguém dentro.

**Mitigação adotada:** o trabalho de campo entra no plano como task nomeada da epic E10, com prazo, em vez de virar responsabilidade difusa. Recomenda-se que o grupo revise essa alocação ao fim do mês 2 — se as entrevistas não tiverem acontecido até lá, o cronograma do piloto não fecha.

### 1.2 Autenticação por e-mail e senha (antes: OTP por SMS)

**Decisão:** o MVP1 autentica por e-mail e senha. O OTP por SMS fica para depois do piloto.

**Motivo:** SMS é o único item pago estrutural de uma stack que, fora ele, custa zero até o piloto. Ver seção 3.

**Contradição assumida:** o spec de 07/08 argumenta que "o público não tem hábito de e-mail; telefone é o login natural". Esse argumento continua válido — a decisão troca custo por atrito de adoção, conscientemente.

**Mitigação (task T01.2):** aceitar o **telefone como identificador de login**, com senha e sem verificação por SMS, mapeando internamente para um e-mail sintético no Supabase. O profissional digita o número que sabe de cor; o custo continua zero; quando o SMS entrar, liga-se a verificação por cima sem migrar base.

**O que medir no piloto para defender isso:** taxa de abandono no cadastro assistido. Se o atrito for real, ele aparece aí — e vira dado, não opinião.

### 1.3 Custos mapeados e provedores decididos por cotação

**Decisão:** nenhum provedor pago entra no MVP1 sem cotação registrada. Tasks com impacto financeiro recebem a label `custo`.

---

## 2. Escopo do MVP1

Os nove itens essenciais da v1, mais uma epic de fundação na frente e uma de go-live no fim.

**Dentro:** fundação técnica · autenticação · perfil do profissional · busca geográfica · chat em tempo real · registro de contratação · avaliações verificadas · verificação com selo (aprovação manual) · notificações · painel admin · go-live do piloto.

**Fora, conscientemente:** impulsionamento pago com Pix, painel de condomínio, agenda, pagamento do serviço, app nativo, qualquer recurso de IA, OTP por SMS.

**Marco de conclusão do MVP1:** piloto no ar no **mês 4**, com profissionais reais cadastrados na praça escolhida.

---

## 3. Custos

**Atualizado em 20/09/2026 (T00.9).** Os valores abaixo foram confirmados em fonte ao vivo (site oficial de cada provedor) nesta data — substituem os números de conhecimento até maio/2026 da versão anterior deste documento. Câmbio usado como referência onde necessário: USD 1 ≈ R$ 5,16 (PTAX, 20/09/2026) — consultar cotação atual antes de qualquer compromisso financeiro, o câmbio muda.

### 3.1 Gratuito

| Tecnologia | Limite confirmado no free tier |
|---|---|
| Supabase Free | 500 MB Postgres · 1 GB storage · 5 GB egress + 5 GB cached egress/mês · 50.000 usuários ativos mensais · Realtime incluso (200 conexões simultâneas, 2 milhões de mensagens/mês) · Edge Functions inclusas (500.000 invocações/mês) |
| PostGIS | Extensão nativa do Postgres, open source |
| React + Vite | — |
| Vercel / Netlify / Cloudflare Pages | Free tier cobre tráfego de piloto com folga |
| ViaCEP | Sem chave, sem limite prático |
| Web Push (VAPID) | Padrão do navegador, não passa por serviço pago |
| Mapbox Geocoding | **100.000 requisições/mês grátis** (confirmado — bem acima do estimado antes) |
| LocationIQ | **5.000 requisições/dia grátis**, limite de 2 req/segundo, uso comercial exige link de atribuição |
| Resend | **100 e-mails/dia · 3.000 e-mails/mês** |
| SendGrid | **100 e-mails/dia, mas só por 60 dias** — o plano free não é mais permanente (mudou desde a versão anterior deste doc). Depois disso, o e-mail transacional obrigatoriamente vira Resend ou plano pago. |
| PWA / service worker | — |

**Duas pegadinhas do Supabase Free, confirmadas:** o projeto pausa após **1 semana sem atividade** (fatal se pausar na véspera da defesa) — e o limite é de **2 projetos free ativos por conta**, o que é justo o bastante para separar dev e prod (T00.1), mas não sobra margem para um terceiro projeto de teste. Não há backup diário no free. A partir do mês 4 recomenda-se o Pro.

### 3.2 Pago

| Item | Custo confirmado | Quando |
|---|---|---|
| Supabase Pro | **US$ 25/mês** (1º projeto incluso; projeto adicional a partir de US$ 10/mês) ≈ R$ 129/mês | Meses 4–6 (piloto no ar) |
| Domínio .com.br | ~R$ 40/ano | Mês 4 |
| Geocoding acima do free tier (Mapbox) | US$ 0,75 por 1.000 requisições (100k–500k/mês) · US$ 0,60 por 1.000 (500k–1M) · US$ 0,45 por 1.000 (acima de 1M) | Só se estourar 100k/mês — improvável no piloto |
| E-mail acima do free tier (Resend Pro) | US$ 20/mês por 50.000 e-mails · US$ 0,90 por 1.000 extras | Só se estourar 3.000/mês |
| Consulta de antecedentes | **Preço não é público em nenhum dos provedores privados pesquisados** (Infosimples, API Consultas, BGC Brasil) — todos pedem contato comercial para cotar. A API gratuita do governo (gov.br Conecta) **é restrita a órgão público federal e estadual, não atende empresa privada** — não é opção para o Empregaê. Mantemos a faixa R$ 10–25/consulta como estimativa não confirmada até alguém do grupo pedir a cotação real (ver questão em aberto na seção 9). |
| SMS para OTP — Comtele | R$ 0,12/SMS na faixa de 500 mensagens (cai com volume) · R$ 1,00 de crédito teste (~10 SMS) | **Fora do MVP1** |
| SMS para OTP — Zenvia | US$ 0,0184/SMS no pacote de US$ 20 até US$ 0,0129/SMS no pacote de US$ 400 (≈ R$ 0,067–R$ 0,095/SMS) — preço em BRL não é público, só por pacote em USD | **Fora do MVP1** |
| Pix (Mercado Pago / Asaas) | — | **Fora do MVP1** |

### 3.3 A armadilha do geocoding

Confirmado: o Nominatim público é gratuito, mas a política de uso **proíbe autocomplete pesado** (1 requisição por segundo, User-Agent identificável) — a busca "estilo Maps" do protótipo atual não cabe ali.

Com os números confirmados, a decisão fica mais fácil do que parecia em 21/08: o **Mapbox tem free tier de 100.000 requisições/mês** — muito maior que o estimado antes — e cobre a busca do piloto inteiro sem custo. A LocationIQ é mais restrita (5.000/dia = ~150.000/mês, mas com teto de 2 req/segundo, que pode apertar em autocomplete). **Recomendação para a T03.2: Mapbox**, justamente pelo teto mensal folgado; decisão final continua sendo do Dev B, que integra.

### 3.4 Total estimado

| Fase | Custo |
|---|---|
| Meses 1–3 (desenvolvimento) | **R$ 0** (dentro dos free tiers confirmados acima, inclusive geocoding) |
| Meses 4–6 (piloto no ar) | Supabase Pro ≈ R$ 387 (3 meses) · domínio R$ 40 |
| **Total do MVP1** | **≈ R$ 430**, fora as consultas de antecedentes (preço ainda não cotado — ver 3.2) e fora qualquer estouro de free tier de e-mail/geocoding, que os números confirmados tornam pouco provável no volume do piloto |

**O que mudou desde a versão de 21/08:** os limites gratuitos de Supabase, Mapbox e Resend são iguais ou maiores do que o estimado — boa notícia, sobra mais margem que o previsto. A má notícia é o SendGrid: o free tier dele deixou de ser permanente (100 e-mails/dia só por 60 dias), o que reforça a escolha do Resend como provedor de e-mail transacional (T08.1) — o Resend continua com free tier permanente. A consulta de antecedentes continua sem preço público; isso é uma questão em aberto real, não só burocracia (seção 9).
---

## 4. Estratégia de paralelização

**Semanas 1–3: os quatro na fundação (E00).** Parece desperdício e não é. O E00 é o único ponto de serialização real do projeto — se ele atrasa, atrasa tudo.

O ponto crítico do E00: ele entrega **o schema inteiro, com RLS e seed**, e não só as tabelas de quem começa primeiro. É isso que desbloqueia o paralelismo. Quem faz Chat começa contra a tabela `conversations` no dia 1, sem esperar a UI de perfil ficar pronta.

**Trade-off assumido:** o modelo de dados fica menos maleável depois. Aceitável porque ele já está desenhado e revisado no spec de 07/08.

**Depois do E00, quatro trilhas verticais.** Cada dev leva sua feature de ponta a ponta — migration, RPC, RLS e UI — para minimizar colisão de arquivo.

| Trilha | Sequência | Carga |
|---|---|---|
| **Dev A** | E01 Auth → E07 Verificação | Média |
| **Dev B** | E02 Perfis → E03 Busca | Média |
| **Dev C** | E04 Chat → E08 Notificações | Alta (realtime é o mais técnico) |
| **Dev D** | E05 Contratação → E06 Avaliações → E09 Admin | **Mais longa** |

**A trilha do Dev D é a mais longa e carrega o fosso competitivo do produto** (avaliação verificada). Se houver um dev mais experiente no grupo, é essa trilha que ele pega.

Os cruzamentos entre trilhas (E02→E04, E04→E05) são dependências **de dados, não de código** — resolvidas pelo schema completo do E00. Só a integração final, no E10, exige sincronia entre as quatro.

---

## 5. Grafo de dependência

```
E00 Fundação (todos)
 │
 ├──> E01 Auth (A)
 │      └──> E07 Verificação (A) ─────────────┐
 │                                            │
 ├──> E02 Perfis (B)                          │
 │      ├──> E03 Busca (B)                    │
 │      └──> E04 Chat (C)                     │
 │             ├──> E05 Contratação (D)       │
 │             │      └──> E06 Avaliações (D) │
 │             │                    │         │
 │             └──> E08 Notif. (C)  │         │
 │                                  ▼         ▼
 │                             E09 Admin (D) ─┘
 │                                  │
 └──────────────────────────────────┴──> E10 Go-live (todos)
```

**Caminho crítico:** E00 → E02 → E04 → E05 → E06 → E09 → E10. Sete epics encadeadas. Qualquer atraso aqui empurra o piloto para depois do mês 4, e o projeto perde os dois meses de operação real que a apresentação exige.

---

## 6. Convenções do board

**Hierarquia:** Epic é uma issue com a label `epic` e um checklist linkando suas tasks. Cada task é uma issue própria — atribuível, é o card que anda no board. Subtasks são checkboxes dentro da task.

**Labels:**

| Grupo | Valores |
|---|---|
| Tipo | `epic` |
| Área | `area:db` `area:auth` `area:frontend` `area:realtime` `area:infra` `area:admin` |
| Trilha | `dev:a` `dev:b` `dev:c` `dev:d` `dev:todos` |
| Prioridade | `prio:bloqueante` `prio:essencial` `prio:desejavel` |
| Financeiro | `custo` |

**Milestones:** `Mês 1` · `Mês 2` · `Mês 3` · `Mês 4` · `Pós-MVP1`.

**Definição de pronto** (vale para toda task):

- Código na `main` via PR revisado por outro integrante
- RLS testada com usuário não autorizado, quando a task toca dados
- Funciona no PWA em tela de celular
- Nenhum dado fixo no código sobrevive passando por dado real

---

## 7. As 11 epics

### E00 — Fundação · `dev:todos` · Mês 1 · `prio:bloqueante`

Bloqueia todas as outras epics. Entrega o schema completo, não incremental.

| Task | Subtasks |
|---|---|
| **T00.1** Projeto Supabase e ambientes | Criar projeto · separar dev e prod · variáveis de ambiente · documentar acesso do grupo |
| **T00.2** Schema completo em migrations | Todas as tabelas do spec de 07/08 · chaves e constraints · `reviews.booking_id UNIQUE` · migrations versionadas |
| **T00.3** PostGIS e índices | Habilitar extensão · coluna `geography(Point,4326)` · índice GiST · índices de chave estrangeira |
| **T00.4** Políticas RLS | Uma policy por tabela · `messages` só para os dois participantes · `telefone` nunca em busca pública · `location` nunca exposta · `documento_url` só admin · escrita em `reviews` exige booking concluído |
| **T00.5** Seed de desenvolvimento | Categorias reais · 20 perfis fictícios geolocalizados · script repetível |
| **T00.6** Shell React + Vite | Estrutura de pastas · roteamento · migração do CSS existente (1.172 linhas, preservar) · manter manifest e service worker |
| **T00.7** Camada de acesso a dados | Cliente Supabase · tipos gerados do schema · tratamento de erro padronizado |
| **T00.8** CI/CD | Deploy contínuo da `main` · preview por PR · lint e build no CI |
| **T00.9** Cotação de custos e provedores · `custo` | Confirmar free tier do Supabase · cotar geocoding · cotar e-mail transacional · cotar SMS (para depois) · registrar tudo na seção 3 deste documento |
| **T00.10** Convenções de trabalho | Padrão de branch e commit · template de PR · proteção da `main` · quem revisa quem |

### E01 — Autenticação · `dev:a` · Mês 1 · `area:auth`

| Task | Subtasks |
|---|---|
| **T01.1** Cadastro e login por e-mail e senha | Telas · validação · mensagens de erro em português |
| **T01.2** Telefone como identificador de login | Mapear telefone para e-mail sintético · normalizar DDD e formato · permitir os dois caminhos · documentar para a migração futura ao OTP |
| **T01.3** Sessão e rotas protegidas | Persistência · refresh · logout · redirecionamento |
| **T01.4** Recuperação de senha | Fluxo por e-mail · tratar o caso de quem entrou por telefone |
| **T01.5** Criação automática do `profiles` | Trigger no signup · rollback em falha |
| **T01.6** Onboarding | Escolha entre cliente, profissional ou ambos · consentimento LGPD no cadastro |

### E02 — Perfil do profissional · `dev:b` · Mês 1–2 · `area:frontend`

| Task | Subtasks |
|---|---|
| **T02.1** CRUD do perfil profissional | Criar · editar · ativar e desativar · validações |
| **T02.2** Foto de perfil | Upload para Storage · RLS do bucket · redimensionar no cliente · placeholder |
| **T02.3** Categorias de atendimento | Seleção múltipla · gravar em `worker_categories` · limite razoável |
| **T02.4** Preço e unidade | Valor em centavos · hora, diária ou serviço · exibição formatada |
| **T02.5** Endereço e raio | CEP via ViaCEP · endereço para coordenada · gravar `location` · bairro/cidade/UF públicos · raio de atendimento |
| **T02.6** Página pública do perfil | Sem telefone · sem coordenada exata · só bairro e distância · botão para iniciar conversa |

### E03 — Busca geográfica · `dev:b` · Mês 2 · `area:db`

| Task | Subtasks |
|---|---|
| **T03.1** RPC de busca | `ST_DWithin` com raio · retornar `distancia_km` calculada no servidor · filtro de categoria · ordenação · nunca retornar `location` |
| **T03.2** Provedor de geocoding · `custo` | Comparar Mapbox, LocationIQ e Nominatim self-hosted · decidir · integrar · cache local |
| **T03.3** Autocomplete de endereço | Sugestões com debounce · fallback para busca por CEP |
| **T03.4** Tela de resultados | Lista · filtro de categoria e raio · paginação · versão mobile |
| **T03.5** Estado vazio | Mensagem honesta quando o bairro tem pouca oferta · captura de e-mail para avisar quando houver |
| **T03.6** Telemetria de busca | Registrar toda busca com raio, categoria e número de resultados · **alimenta a métrica de liquidez: percentual de buscas com 5 ou mais resultados** |

### E04 — Chat em tempo real · `dev:c` · Mês 2–3 · `area:realtime`

| Task | Subtasks |
|---|---|
| **T04.1** Abrir conversa com briefing | Formulário estruturado por categoria (simplificado do protótipo) · gravar em `conversations.briefing` · impedir conversa duplicada |
| **T04.2** Mensagens | Enviar · listar com paginação · estado de envio e de falha |
| **T04.3** Realtime | Subscription na tabela · reconexão · ordem garantida |
| **T04.4** Lista de conversas | Ordenar por atividade · contador de não lidas · marcar como lida |
| **T04.5** Teste da RLS do chat | Provar que um terceiro autenticado não lê a conversa · registrar o teste |
| **T04.6** Remover o WhatsApp do produto | Tirar o botão (`app.js:477` no legado) · garantir que o chat é o único caminho · **não bloquear troca de telefone dentro do chat** |

### E05 — Registro de contratação · `dev:d` · Mês 3 · `area:frontend`

| Task | Subtasks |
|---|---|
| **T05.1** Propor contratação | Dentro da conversa · valor combinado e data · status `proposto` |
| **T05.2** Aceitar ou recusar | Ação do outro lado · transição para `aceito` · notificar |
| **T05.3** Concluir | Confirmação dos dois lados · gravar `concluido_em` e `concluido_por` · **é o que destrava a avaliação** |
| **T05.4** Cancelar | Motivo · definir quem pode cancelar em cada status |
| **T05.5** Histórico | Lista para cliente e para profissional · filtro por status |
| **T05.6** Métrica de volume transacionado | Somar `valor_combinado_centavos` dos concluídos · **sem processar pagamento** |

### E06 — Avaliações verificadas · `dev:d` · Mês 3–4 · `area:db`

O fosso competitivo do produto. A trava é estrutural, não de aplicação.

| Task | Subtasks |
|---|---|
| **T06.1** Trava estrutural | `booking_id UNIQUE` e FK obrigatória · RLS exigindo `status = 'concluido'` · **teste provando que avaliação sem contratação é impossível** |
| **T06.2** Formulário de avaliação | Nota de 1 a 5 · comentário · liberado só após conclusão |
| **T06.3** Exibição | Média e total no perfil e na busca · lista paginada · nenhuma avaliação fixa no código |
| **T06.4** Lembrete de avaliação | Disparo após conclusão · um lembrete só, não insistir |
| **T06.5** Denúncia de avaliação | Marcar para moderação · entra na fila do admin (E09) |

### E07 — Verificação e selo · `dev:a` · Mês 2–3 · `area:auth`

No piloto o processo é **manual nas duas pontas**: o grupo faz a consulta de antecedentes fora do sistema e registra a aprovação no admin. Cem profissionais dá para verificar na mão.

| Task | Subtasks |
|---|---|
| **T07.1** Upload de documento | Bucket privado · RLS só admin · tipos aceitos · limite de tamanho |
| **T07.2** Solicitação pelo profissional | Fluxo de pedido · status visível · reenvio se reprovado |
| **T07.3** Selo no produto | Exibir no perfil e na busca · respeitar `verificado_ate` |
| **T07.4** Escopo declarado da verificação | Página pública dizendo **exatamente** o que é e o que não é checado · **mitiga o risco de responsabilidade em incidente** |
| **T07.5** Expiração | Rotina de validade anual · aviso antes de expirar · remover selo vencido |
| **T07.6** Canal de denúncia | Formulário para reportar profissional verificado · rota direta para o admin |

### E08 — Notificações · `dev:c` · Mês 3 · `area:infra`

| Task | Subtasks |
|---|---|
| **T08.1** E-mail transacional · `custo` | Integrar provedor · templates em português · remetente verificado |
| **T08.2** Web Push | Chaves VAPID · pedido de permissão no momento certo · gravar subscription · service worker |
| **T08.3** Disparo por evento | Edge Function · mensagem nova · contratação proposta, aceita e concluída · verificação aprovada ou reprovada |
| **T08.4** Preferências | Ligar e desligar por canal · descadastro no rodapé do e-mail |
| **T08.5** Lembrete de mensagem não respondida | Após 24h · **alimenta a métrica de tempo mediano de primeira resposta** |

### E09 — Painel admin · `dev:d` · Mês 4 · `area:admin`

| Task | Subtasks |
|---|---|
| **T09.1** Acesso restrito | Papel de admin · RLS · rota separada · **testar que usuário comum não entra** |
| **T09.2** Fila de verificação | Listar pendentes · ver documento · aprovar ou reprovar com observação · definir validade |
| **T09.3** Moderação | Perfis e avaliações denunciados · ocultar conteúdo · suspender perfil |
| **T09.4** Dashboard de métricas do piloto | Profissionais na praça · densidade por raio de 5 km · percentual de buscas com 5 ou mais resultados · contratações · adesão à verificação · tempo mediano de resposta |
| **T09.5** Exportação | CSV das métricas · **alimenta direto o TCC e o slide de tração** |

### E10 — Go-live do piloto · `dev:todos` · Mês 4 · `prio:bloqueante`

| Task | Subtasks |
|---|---|
| **T10.1** Conformidade legal e LGPD | Termos de uso · política de privacidade · consentimento explícito no cadastro · canal de exclusão de dados · **aviso sobre risco de vínculo empregatício** |
| **T10.2** Ambiente de produção · `custo` | Domínio · Supabase Pro · variáveis de produção · backup |
| **T10.3** Observabilidade | Log de erro · alerta de falha · monitor de disponibilidade |
| **T10.4** Checklist de release | Teste em celular real · auditoria de RLS ponta a ponta · varredura por dado fixo no código · teste de carga leve |
| **T10.5** Trabalho de campo — oferta | Escolher a praça · 15 entrevistas · recrutar 30 profissionais no mesmo raio de 5 km · cadastro assistido |
| **T10.6** Plano B da demonstração | Vídeo gravado da demo · ambiente estável para a banca |

---

## 8. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| **E00 atrasa e empurra tudo** | Alta | Os 4 juntos nas semanas 1–3; nenhuma outra epic começa antes |
| **Trabalho de campo não acontece** — 4 devs, 0 dedicados | **Alta** | T10.5 tem dono e prazo; revisar a alocação ao fim do mês 2 |
| **Chat realtime consome mais que o previsto** | Média | A trilha do Dev C só tem 2 epics; E08 pode escorregar para o mês 4 |
| **Atrito de adoção do login por e-mail** | Média | T01.2 (login por telefone); medir abandono no cadastro assistido |
| **Free tier do Supabase pausa antes da defesa** | Média | Subir para Pro no mês 4 (T10.2) |
| **Densidade insuficiente: busca devolve tela vazia** | Média | Meta de 30 profissionais no mesmo raio antes de captar demanda; T03.5 trata o estado vazio com honestidade |
| **Incidente com profissional verificado** | Baixa, impacto alto | T07.4 escopo declarado · T07.6 canal de denúncia |

---

## 9. Questões em aberto

| Questão | Responsável | Prazo |
|---|---|---|
| Região-piloto | Grupo | Mês 1 |
| Provedor de geocoding (T03.2) | Dev B | Mês 2 |
| Provedor de e-mail transacional (T08.1) | Dev C | Mês 3 |
| Provedor e preço da consulta de antecedentes | Grupo | Mês 1 |
| Quem assume a trilha D (a mais longa) | Grupo | Antes do fim do E00 |
| Quem é o dono real do trabalho de campo | Grupo | **Mês 1 — o mais urgente da lista** |

---

## 10. Contagem para o board

| | Quantidade |
|---|---|
| Epics (issues com label `epic`) | 11 |
| Tasks (issues atribuíveis, cards do board) | 67 |
| **Total de issues a criar** | **78** |

Subtasks ficam como checkbox dentro das tasks e não geram issue.
