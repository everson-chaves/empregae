# Geocoding do endereço do profissional (T02.5) — solução provisória

## O problema

`worker_profiles.location` precisa de uma coordenada (lat/lon) pra existir.
A T02.5 pede "endereço para coordenada": a pessoa digita o CEP, a T02.5
confirma bairro/cidade/UF (via ViaCEP) e depois converte esse endereço em
coordenada pra gravar em `location`.

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

## Ponto único de troca

Toda a lógica de geocoding fica isolada em `geocodificarEndereco()`
(`src/lib/anuncio.ts`). Quem chama (`salvarAnuncio`) não sabe qual provedor
está por trás. Quando a T03.2 escolher e montar o provedor definitivo
(provavelmente via Edge Function, pra manter a chave fora do cliente), a
troca é só essa função — o resto da T02.5 não muda.
