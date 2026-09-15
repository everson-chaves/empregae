# Empregaê

**O classificado de serviços do bairro.** Uma plataforma que conecta trabalhadores informais a clientes próximos por busca geográfica, chat interno e reputação verificada.

Projeto de TCC de MBA — startup de impacto social.

## Problema

No Brasil, dezenas de milhões de pessoas trabalham por conta própria sem carteira assinada. Diaristas, cuidadores de idosos, eletricistas, pintores, encanadores, costureiras. Quase todos dependem de indicação para conseguir o próximo serviço, o que limita a renda e deixa o profissional invisível para quem acabou de chegar no bairro.

Do outro lado, o cliente que precisa contratar não tem onde buscar. Recorre a grupos de WhatsApp e tentativa e erro, sem histórico e sem verificação.

## Solução

O cliente digita o endereço, escolhe o serviço e encontra profissionais dentro do raio que definir. A conversa acontece no chat da plataforma, onde os dois combinam preço, data e detalhes. Quando o serviço termina, a contratação é marcada como concluída — e só então a avaliação é liberada.

Essa trava é o núcleo do produto: em marketplace de serviços a reputação é o ativo, e reputação que qualquer um pode escrever não vale nada.

## Modelo de negócio

A receita vem da **descoberta**, nunca da transação. Não há taxa sobre o serviço contratado, porque em serviço local recorrente as duas partes acabariam combinando por fora — e a plataforma viraria inimiga dos dois lados.

| Camada | Preço |
|---|---|
| Verificação de documento e antecedentes, com selo anual | R$ 39/ano |
| Impulsionamento na busca, por período | R$ 7 a R$ 20 |
| Contrato B2B com condomínios e administradoras | R$ 250 a 400/mês |
| Serviços financeiros — seguro e antecipação (longo prazo) | Comissão |

**O trabalhador nunca paga para trabalhar, só para aparecer — e só quando quiser.** Cadastro, presença na busca e recebimento de contatos são gratuitos e permanentes.

Detalhamento em [`docs/modelo-de-negocio.md`](docs/modelo-de-negocio.md).

## Estado do código

⚠️ **O que está neste repositório é o protótipo legado**, escrito em vanilla JS com persistência em `localStorage` e dados simulados. Ele demonstra o fluxo de busca, mas não sustenta operação real — e ainda reflete o modelo de negócio antigo (assinatura de R$ 9,90 e contato por WhatsApp), que foi substituído.

A v1 está especificada em [`docs/superpowers/specs/`](docs/superpowers/specs/) e será construída sobre React e Supabase.

### Protótipo legado

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Protótipo web completo |
| `playstore.html` | Simulação de app mobile simples |
| `app.js` | Busca, filtros, cadastro e planos |
| `styles.css` | Estilos — **aproveitados na v1** |
| `manifest.webmanifest` | Configuração do PWA |
| `service-worker.js` | Cache básico para instalação |
| `assets/` | Imagens e logo |

Para ver: abra `index.html` no navegador.

### Stack da v1

- **Frontend:** React (Vite), mantendo o PWA
- **Backend:** Supabase — Postgres com PostGIS para busca geográfica, autenticação por telefone, chat em tempo real e controle de acesso no banco
- **Geocoding:** ViaCEP e Nominatim ou Mapbox
- **Pagamento:** Pix via Mercado Pago ou Asaas

## Estratégia de entrada

O produto é aberto nacionalmente desde o primeiro dia; a **operação começa concentrada em uma única região-piloto**. Valor de marketplace é local — cadastros espalhados pelo país produzem buscas vazias, e busca vazia é usuário que não volta.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/modelo-de-negocio.md`](docs/modelo-de-negocio.md) | Camadas de receita, unit economics, riscos |
| [`docs/resumo-executivo.md`](docs/resumo-executivo.md) | Visão geral em uma página |
| [`docs/pitch.md`](docs/pitch.md) | Pitch de 30s, 1min e 3min |
| [`docs/roteiro-apresentacao.md`](docs/roteiro-apresentacao.md) | Roteiro do pitch e perguntas prováveis |
| [`docs/roadmap.md`](docs/roadmap.md) | Cronograma de 6 meses e escopo da v1 |
| [`docs/checklist-faculdade.md`](docs/checklist-faculdade.md) | Checklist de entrega do TCC |
| [`docs/demo.md`](docs/demo.md) | Roteiro de demonstração |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Especificação técnica e de negócio da v1 |

## ODS relacionados

- **ODS 1** — Erradicação da pobreza
- **ODS 8** — Trabalho decente e crescimento econômico
- **ODS 10** — Redução das desigualdades

A escolha de não monetizar o lado mais vulnerável do marketplace é uma decisão de desenho, não um discurso de apresentação.
