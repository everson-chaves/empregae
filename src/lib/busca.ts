import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { UnidadePreco } from './anuncio'
import { traduzirErro, ErroDeAplicacao } from './erros'

// E03 — Busca geográfica (T03.1 RPC, T03.3 autocomplete, T03.6 telemetria).
//
// O geocoding usado aqui (buscarEnderecoPorCep, geocodificarEndereco) é o
// mesmo da T02.5 — ver lib/anuncio.ts e docs/geocoding-provisorio.md pra a
// decisão (T03.2) de por que é Nominatim/ViaCEP e não um provedor pago.
export { buscarEnderecoPorCep, geocodificarEndereco } from './anuncio'

export type ResultadoBusca = {
  workerProfileId: string
  profileId: string
  nome: string
  avatarUrl: string | null
  descricao: string | null
  precoMedioCentavos: number | null
  unidadePreco: UnidadePreco | null
  raioAtendimentoKm: number
  bairro: string | null
  cidade: string | null
  uf: string | null
  verificadoAte: string | null
  categorias: string[]
  distanciaKm: number | null
}

export type ParametrosBusca = {
  lat: number
  lon: number
  categoriaSlug?: string | null
  raioMaximoKm?: number | null
  limite?: number
  offset?: number
}

/**
 * T03.1 — chama a RPC `buscar_profissionais`. A RPC roda SECURITY DEFINER
 * e já devolve `distancia_km` calculada — este arquivo nunca vê nem envia
 * a coordenada exata de ninguém, só lat/lon do PONTO DE BUSCA (a localização
 * de quem está procurando, não a de nenhum profissional).
 */
export async function buscarProfissionais(parametros: ParametrosBusca): Promise<ResultadoBusca[]> {
  const { data, error } = await supabase.rpc('buscar_profissionais', {
    p_lat: parametros.lat,
    p_lon: parametros.lon,
    p_categoria_slug: parametros.categoriaSlug ?? null,
    p_raio_maximo_km: parametros.raioMaximoKm ?? null,
    p_limite: parametros.limite ?? 20,
    p_offset: parametros.offset ?? 0,
  })

  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }

  return (data ?? []).map((linha) => ({
    workerProfileId: linha.worker_profile_id,
    profileId: linha.profile_id,
    nome: linha.nome,
    avatarUrl: linha.avatar_url,
    descricao: linha.descricao,
    precoMedioCentavos: linha.preco_medio_centavos,
    unidadePreco: linha.unidade_preco,
    raioAtendimentoKm: linha.raio_atendimento_km,
    bairro: linha.bairro,
    cidade: linha.cidade,
    uf: linha.uf,
    verificadoAte: linha.verificado_ate,
    categorias: linha.categorias ?? [],
    distanciaKm: linha.distancia_km,
  }))
}

/**
 * T03.6 — registra a busca para a métrica de liquidez. Erro aqui NUNCA
 * deveria quebrar a busca em si — telemetria é acessório, resultado é o
 * essencial. Por isso não lança: só avisa no console.
 */
export async function registrarBuscaLog(dados: {
  lat: number
  lon: number
  raioMaximoKm?: number | null
  categoriaSlug?: string | null
  numeroResultados: number
}): Promise<void> {
  const { data: sessao } = await supabase.auth.getSession()
  const { error } = await supabase.from('search_logs').insert({
    usuario_id: sessao.session?.user.id ?? null,
    lat: dados.lat,
    lon: dados.lon,
    raio_maximo_km: dados.raioMaximoKm ?? null,
    categoria_slug: dados.categoriaSlug ?? null,
    numero_resultados: dados.numeroResultados,
  })
  if (error) console.warn('[telemetria] falha ao registrar busca', error)
}

// ---------------------------------------------------------------------------
// T03.5 — Estado vazio: pedir aviso quando houver oferta
// ---------------------------------------------------------------------------

export async function pedirAvisoDeBusca(dados: {
  email: string
  categoriaSlug?: string | null
  lat: number
  lon: number
}): Promise<void> {
  const { error } = await supabase.from('busca_avisos').insert({
    email: dados.email.trim(),
    categoria_slug: dados.categoriaSlug ?? null,
    lat: dados.lat,
    lon: dados.lon,
  })
  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
}

// ---------------------------------------------------------------------------
// T03.3 — Autocomplete de endereço
// ---------------------------------------------------------------------------

export type SugestaoEndereco = {
  rotulo: string
  lat: number
  lon: number
}

/**
 * Busca sugestões de endereço no Nominatim.
 *
 * NÃO chame isto a cada tecla digitada: o Nominatim público proíbe uso
 * pesado (política de ~1 req/s, ver docs/geocoding-provisorio.md). Quem usa
 * esta função precisa debounçar antes de chamar — é o que `useAutocompleteEndereco`
 * (abaixo) faz. Esta função em si só sabe fazer UMA busca; a decisão de
 * "quando" é de quem chama.
 */
export async function buscarSugestoesEndereco(texto: string, sinal?: AbortSignal): Promise<SugestaoEndereco[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', texto)
  url.searchParams.set('countrycodes', 'br')
  url.searchParams.set('limit', '5')

  let resposta: Response
  try {
    resposta = await fetch(url.toString(), { signal: sinal })
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro
    return []
  }
  if (!resposta.ok) return []

  const resultados = (await resposta.json()) as Array<{ display_name: string; lat: string; lon: string }>
  return resultados
    .map((item) => ({ rotulo: item.display_name, lat: Number(item.lat), lon: Number(item.lon) }))
    .filter((item) => !Number.isNaN(item.lat) && !Number.isNaN(item.lon))
}

export function formatarDistancia(km: number | null): string {
  if (km === null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}


/**
 * Debounça a digitação antes de chamar `buscarSugestoesEndereco` — é o que
 * mantém a T03.3 dentro da política de uso do Nominatim (ver comentário da
 * função acima). Cancela a busca anterior (AbortController) e só dispara
 * depois de `debounceMs` sem digitar, e só com pelo menos 4 caracteres —
 * "rua a" não devolve nada útil e só gasta a cota da política de uso.
 */
export function useAutocompleteEndereco(texto: string, debounceMs = 700) {
  const [sugestoes, setSugestoes] = useState<SugestaoEndereco[]>([])
  const [buscando, setBuscando] = useState(false)
  const termo = texto.trim()

  useEffect(() => {
    if (termo.length < 4) return

    const controlador = new AbortController()
    const temporizador = setTimeout(() => {
      setBuscando(true)
      buscarSugestoesEndereco(termo, controlador.signal)
        .then((resultado) => setSugestoes(resultado))
        .catch(() => {
          // Falha de autocomplete não é erro visível: a pessoa ainda pode
          // buscar por CEP ou tentar de novo.
        })
        .finally(() => setBuscando(false))
    }, debounceMs)

    return () => {
      clearTimeout(temporizador)
      controlador.abort()
    }
  }, [termo, debounceMs])

  return { sugestoes: termo.length < 4 ? [] : sugestoes, buscando }
}
