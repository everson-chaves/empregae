# Roteiro de Demonstração

Este documento tem duas partes: o roteiro do **protótipo legado**, que é o que roda hoje, e o roteiro-alvo da **v1**, que é o que será demonstrado na banca.

---

## Parte 1 — Protótipo legado (o que existe hoje)

⚠️ O protótipo ainda reflete o modelo de negócio antigo: assinatura de R$ 9,90/mês, contato por WhatsApp e "melhorar com IA". Esses elementos foram substituídos e **não devem ser apresentados como se fossem o modelo atual**.

Use este roteiro apenas para demonstração interna enquanto a v1 não está pronta.

**Como abrir:** `index.html` para a plataforma completa, `playstore.html` para a simulação mobile.

**Fluxo:**

1. Abrir a tela mobile simples e mostrar os dois caminhos: "preciso de serviço" e "quero trabalhar"
2. Ir para a busca completa
3. Digitar um bairro ou endereço e ver as sugestões
4. Escolher um serviço
5. Ver os profissionais na listagem, ordenados por proximidade
6. Abrir um perfil
7. Ir para o cadastro e criar um profissional de teste
8. Mostrar que o novo perfil aparece na listagem

**Dados de teste:**

```
Nome:       Juliana Oliveira
WhatsApp:   11999999999
Serviço:    Diarista
Bairro:     Centro
Preço:      R$ 150 diária
Descrição:  Faço limpeza geral, organização e passo roupa.
```

---

## Parte 2 — Roteiro-alvo da v1

Este é o fluxo a ser demonstrado na apresentação final, com dados reais do piloto. Nada aqui deve ser demonstrado com dados simulados — a força da apresentação está em serem contratações que aconteceram de verdade.

### Fluxo do cliente

1. **Busca** — digitar o endereço, escolher a categoria e ajustar o raio
2. **Resultados** — profissionais reais da região, ordenados por proximidade, com profissionais impulsionados no topo
3. **Perfil** — foto, descrição, preço médio, selo de verificação e avaliações
4. **Briefing** — responder as perguntas estruturadas do serviço, para chegar no chat com o pedido já formado
5. **Chat** — conversar e combinar preço e data
6. **Contratação** — registrar o pedido, aceitar, e marcar como concluído após o serviço
7. **Avaliação** — liberada **somente** após a conclusão

Pare no passo 7 e explique a trava. É o diferencial defensável do produto e o ponto que mais rende na banca.

### Fluxo do profissional

1. **Cadastro** com login por telefone
2. **Perfil** — foto, categorias, descrição, preço médio e raio de atendimento
3. **Notificação** de mensagem nova, por e-mail e push
4. **Verificação** — envio de documento e obtenção do selo
5. **Impulsionamento** — compra de destaque por período, pago via Pix

### Painel administrativo

Mostrar rapidamente, se houver tempo: fila de verificação, moderação e métricas do piloto.

### O que destacar

- **Liquidez** — a busca devolve resultados de verdade porque a operação é concentrada
- **Reputação verificada** — a trava da avaliação
- **Nenhuma cobrança para trabalhar** — o profissional só paga se decidir que vale

### Preparação

- [ ] Ambiente estável, com dados reais do piloto carregados
- [ ] Contas de teste prontas para os dois lados
- [ ] Vídeo gravado como plano B para falha de internet
- [ ] Fluxo cronometrado dentro do tempo do pitch
