# Geocoding (T02.5 e T03.2) — decisão de provedor

## O problema

Duas tasks de epics diferentes precisam da mesma coisa — converter endereço
em coordenada:

- **T02.5** (E02): `worker_profiles.location` precisa de uma coordenada pra
  existir. A pessoa digita o CEP, confirma bairro/cidade/UF (via ViaCEP) e
  isso vira `location`.
- **T03.2** (E03): é literalmente a task de "escolher e integrar o provedor
  de geocoding" pro produto inteiro — a busca (T03.1) parte da localização
  de quem busca, e o autocomplete de endereço (T03.3) também precisa
  converter texto em coordenada.

Por serem o mesmo problema, este documento cobre as duas: a decisão de
provedor é uma só, usada nos dois lugares.

Essa conversão — geocoding — normalmente exige um provedor pago com chave de
API (Mapbox, LocationIQ, Google). A T00.9 já pesquisou preços e recomendou
Mapbox pra T03.2, pelo tier gratuito maior (100k requisições/mês).

## Por que não usar Mapbox agora

Duas travas, não uma só:

1. **T03.2 ainda não existe.** É ela quem formalmente decide e integra o
   provedor de geocoding pro produto inteiro (busca E03 incluída) — a T02.5
   não deveria antecipar essa decisão sozinha, só precisar de uma coordenada
   funcionando.
2. **Regra do projeto: chave de provedor nunca no cliente** (ver
   `.env.example`, seção "NUNCA coloque aqui"). Uma `VITE_*` env var vai pro
   bundle JS e fica visível pra qualquer um que abrir o DevTools. Uma chave
   de geocoding só pode viver atrás de uma Edge Function — infraestrutura
   que ninguém montou ainda.

## O que a T02.5 faz enquanto isso

Usa o **Nominatim público** (`nominatim.openstreetmap.org`), da OpenStreetMap:
gratuito, sem chave, chamado direto do navegador. Não é a decisão final de
provedor — é o que dá pra fazer sem violar a regra acima nem bloquear a
epic inteira esperando a T03.2.

Limitações conhecidas, assumidas conscientemente:

- Uso público do Nominatim tem política de uso (nominal ~1 req/s, pede
  identificação da aplicação). Volume do MVP1/piloto (dezenas a poucas
  centenas de profissionais) fica bem abaixo do que preocuparia essa
  política.
- Cobertura de endereço no Brasil é mais fraca que a de um provedor pago em
  ruas pouco mapeadas — pode devolver `null` pra um endereço válido. Nesse
  caso o anúncio é salvo mesmo assim (descrição, preço, categorias,
  bairro/cidade/UF), só não pode ser **publicado** até a coordenada existir
  — a constraint `perfil_ativo_esta_completo` barra isso no banco, com
  mensagem amigável (`lib/erros.ts`).

## Decisão T03.2: Nominatim + ViaCEP para o MVP1/piloto

Formalizando o que a T02.5 já vinha fazendo: **o provedor escolhido para o
MVP1 é o par Nominatim (coordenada) + ViaCEP (CEP → endereço)**, não o
Mapbox que a T00.9 tinha levantado como mais barato em escala. O motivo não
é preço — é que Mapbox exige chave, chave não pode ir pro cliente, e
ninguém montou a Edge Function que guardaria essa chave. Nominatim/ViaCEP
resolvem sem essa peça de infraestrutura.

Isso é uma decisão de ESCALA, não uma decisão definitiva: revisitar quando
qualquer um destes acontecer —

- o volume de buscas/cadastros esbarrar na política de uso do Nominatim
  (~1 req/s) mesmo com o debounce da T03.3;
- alguém montar a Edge Function que guarda chave de provedor com segurança;
- a precisão do Nominatim no Brasil se mostrar baixa demais num bairro que
  importa pro piloto.

Nenhuma dessas é bloqueante hoje: volume do piloto é de dezenas a poucas
centenas de pessoas, bem abaixo do que estressaria o Nominatim.

## Ponto único de troca

Toda a lógica de geocoding fica isolada em duas funções de
`src/lib/anuncio.ts`, reexportadas por `src/lib/busca.ts`:
`geocodificarEndereco()` (endereço → coordenada) e
`buscarSugestoesEndereco()` (autocomplete, T03.3). Quem chama não sabe qual
provedor está por trás. Se um dia trocar para Mapbox via Edge Function, a
troca é só essas duas funções — T02.5 e E03 inteira não mudam.
