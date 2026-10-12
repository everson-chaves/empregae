# Modelo de Negócio

## Posicionamento

> **Empregaê é o classificado de serviços do bairro.** Não intermedia dinheiro, não cobra do trabalho — cobra de quem quer ser encontrado primeiro.

## Proposta de valor

### Para clientes

- Encontrar profissionais perto de casa, com filtro por raio de distância.
- Ver avaliações que só existem depois de uma contratação real.
- Conversar e combinar o serviço dentro da plataforma.
- Saber quem passou por verificação de documento e antecedentes.

### Para trabalhadores

- Criar perfil gratuito e aparecer nas buscas do bairro.
- Receber contatos sem pagar nada por isso.
- Construir reputação digital acumulada e portátil.
- Comprar visibilidade extra apenas quando quiser, por período.

## Cliente-alvo

**Contratantes:** moradores de bairros urbanos, famílias, idosos, pequenos comércios e condomínios que precisam de serviços domésticos ou reparos.

**Trabalhadores:** diaristas, cuidadores de idosos, eletricistas, pintores, encanadores, passadeiras, costureiras, montadores, maridos de aluguel e pequenos prestadores em geral.

## Como o Empregaê ganha dinheiro

A receita vem da **descoberta**, não da transação. São quatro camadas, e cada uma tem um pré-requisito diferente — por isso entram em momentos diferentes.

Os prazos abaixo são contados a partir do início da operação.

| # | Camada | Preço | Margem bruta | Pré-requisito | Entra em |
|---|---|---|---|---|---|
| 1 | **Verificação** — checagem de documento e antecedentes, com selo de validade anual | R$ 39/ano | ~60% | Nenhum | Mês 1 |
| 2 | **Impulsionamento** — posição de destaque na busca do bairro, por período contratado | R$ 7 / 7 dias · R$ 20 / 30 dias | ~95% | Densidade de demanda | Mês 6+ |
| 3 | **B2B condomínio** — administradora contrata um pool verificado para os moradores | R$ 250–400/mês | ~80% | Venda direta | Mês 3 |
| 4 | **Serviços financeiros** — seguro de serviço, antecipação de recebíveis | Comissão / spread | — | Base instalada | Ano 3 |

As camadas 1 e 3 **não dependem de volume de tráfego** e por isso sustentam a operação enquanto a liquidez ainda está sendo construída. A camada 2 é o motor de escala. A camada 4 é o horizonte de longo prazo — é o caminho que iFood e Mercado Livre já percorreram no Brasil, monetizando serviços financeiros sobre uma base já conquistada.

## Duas decisões que definem o modelo

### Por que não cobramos taxa sobre o serviço

Serviços locais têm alta recorrência entre as **mesmas duas pessoas**. Uma diarista que atende a mesma casa toda semana, com a plataforma cobrando percentual a cada visita, gera um incentivo óbvio: no segundo mês os dois combinam por fora. O vazamento não é um risco a mitigar, é uma certeza a aceitar. A Thumbtack, nos Estados Unidos, abandonou o modelo de comissão exatamente por isso.

Aceitar essa realidade muda a pergunta certa. Não é *"como impedir que saiam da plataforma"* — é **"o que eu vendo que não pode ser feito por fora"**. Não existe combinar por fora um lugar na listagem nem um selo de verificação.

### Por que não cobramos assinatura fixa do trabalhador

Trabalhador informal tem renda volátil. Mensalidade fixa vira a primeira despesa cortada no mês fraco, o que produz churn alto e ressentimento. Foi esse mecanismo que transformou a GetNinjas em caso recorrente de reclamação de profissional no Brasil.

Cobrança avulsa por período resolve isso porque **se autorregula**: quem está com a agenda cheia não compra impulsionamento; quem está sem trabalho compra. O gasto acompanha a necessidade.

**O princípio, em uma frase:** o trabalhador nunca paga para trabalhar, só para aparecer — e só quando quiser.

## Verificação como serviço real

O selo verificado deixa de ser item de vitrine de um plano pago e passa a exigir checagem de verdade: documento e antecedentes, com validade declarada.

Cobrar por isso é honesto porque a consulta custa dinheiro. Vender sinal de confiança sem checagem por trás seria frágil na apresentação e perigoso na prática — especialmente em cuidado de idosos, onde o selo pode ser justamente a razão de alguém deixar um estranho sozinho com um familiar vulnerável.

## Unit economics

O modelo trabalha com premissas explicitamente rotuladas, a serem validadas em campo durante o piloto:

| Premissa | Valor inicial | Como validar |
|---|---|---|
| Adesão à verificação entre profissionais ativos | 25% | Entrevista e teste de preço no piloto |
| Conversão para impulsionamento pago | 15% | Referências de classificados ficam entre 5% e 15% |
| Recompra de impulsionamento | 5x/ano | Medição direta no piloto |
| CAC do lado da demanda | a medir | Teste real de mídia paga geolocalizada |
| Custo da consulta de antecedentes | R$ 15 | Cotação com IDwall, Serpro ou similar |

Receita anual por profissional ativo, ponderada:

```
Verificação:      R$ 39 × 25%       ≈  R$ 10
Impulsionamento:  R$ 20 × 5 × 15%   ≈  R$ 15
                                      -------
ARPU anual                          ≈  R$ 25
```

Este ARPU é baixo, e reconhecer isso faz parte da honestidade do modelo: **o negócio só fecha em volume alto ou com a receita B2B carregando a margem nos primeiros anos.** É uma limitação a declarar, não a esconder.

## Estrutura de custos

- **Infraestrutura** — Supabase e hospedagem, custo próximo de zero na escala do piloto
- **Verificação** — custo variável por consulta, repassado no preço
- **Meios de pagamento** — em torno de 1% no Pix
- **Aquisição** — o custo relevante; concentrado geograficamente para não desperdiçar
- **Equipe** — quatro sócios sem pró-labore na fase de validação

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Vínculo empregatício em contratação recorrente | Termos de uso claros; a plataforma não define preço, agenda nem exclusividade |
| Incidente com profissional que possui selo | Escopo da verificação declarado explicitamente; canal de denúncia; seguro na camada 4 |
| Falta de liquidez | Concentração geográfica e meta mínima de profissionais por raio antes de captar demanda |
| Proteção de dados (LGPD) | Endereço sempre aproximado; telefone nunca exposto antes do contato; consentimento explícito |
| Receita baixa nos primeiros meses | Camadas 1 e 3, que independem de tráfego |

## Impacto social

O modelo foi desenhado para que a monetização não recaia sobre quem tem menos. O trabalhador entra de graça, aparece de graça e recebe contatos de graça. Só paga se decidir que vale a pena — e por algo que entrega valor concreto.

Contribui diretamente para os Objetivos de Desenvolvimento Sustentável da ONU: **trabalho decente e crescimento econômico (ODS 8)**, **redução das desigualdades (ODS 10)** e **erradicação da pobreza (ODS 1)**.
