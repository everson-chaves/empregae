import { supabase, type Enums, type Insercao, type Linha } from './supabase'
import { desembrulhar, exigirLinha, traduzirErro, ErroDeAplicacao } from './erros'

// E02 — Perfil do profissional (T02.1 a T02.6).
//
// O schema (categories, worker_profiles, worker_categories) e a RLS já
// existiam desde a T00.2/T00.4 — esta epic é a camada de aplicação em cima
// de um banco que já sabia o que fazer. Um detalhe que atravessa tudo aqui:
// `worker_profiles.location` nunca é lido de volta (revogado por T00.4/RLS,
// ver supabase/migrations/20260911100000_rls.sql) — só gravado. Por isso os
// tipos abaixo nunca incluem `location` no que é buscado, só no que é salvo.

export type Categoria = Linha<'categories'>
export type Anuncio = Linha<'worker_profiles'>
export type UnidadePreco = Enums['unidade_preco']
export type TipoPerfil = Enums['tipo_perfil']

const COLUNAS_ANUNCIO =
  'id, profile_id, descricao, preco_medio_centavos, unidade_preco, ' +
  'raio_atendimento_km, bairro, cidade, uf, ativo, verificado_ate, created_at, updated_at'

// ---------------------------------------------------------------------------
// Categorias (catálogo)
// ---------------------------------------------------------------------------

export async function buscarCategorias(): Promise<Categoria[]> {
  return desembrulhar(await supabase.from('categories').select('*').order('ordem'))
}

// ---------------------------------------------------------------------------
// Tipo de perfil (cliente/profissional/ambos) — só o suficiente pra decidir
// se a pessoa tem o que fazer em "Meu perfil". A T01.6 (onboarding, branch
// paralela) tem uma versão mais completa disso; esta função fica só com o
// mínimo que a E02 precisa, sem depender de uma branch que ainda não chegou
// em develop.
// ---------------------------------------------------------------------------

export async function buscarTipoPerfil(profileId: string): Promise<TipoPerfil> {
  const linha = desembrulhar<{ tipo: TipoPerfil }>(
    await supabase.from('profiles').select('tipo').eq('id', profileId).single(),
  )
  return linha.tipo
}

// ---------------------------------------------------------------------------
// Meu anúncio (T02.1) — CRUD do dono
// ---------------------------------------------------------------------------

export type PerfilBasico = { id: string; nome: string; avatarUrl: string | null }

async function buscarPerfilBasico(profileId: string): Promise<PerfilBasico | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, avatar_url')
    .eq('id', profileId)
    .maybeSingle()
  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  if (!data) return null
  return { id: data.id, nome: data.nome, avatarUrl: data.avatar_url }
}

export type MeuAnuncio = {
  perfil: PerfilBasico | null
  anuncio: Anuncio | null
  categoriaIds: string[]
}

export async function buscarMeuAnuncio(profileId: string): Promise<MeuAnuncio> {
  const perfil = await buscarPerfilBasico(profileId)

  const { data: anuncio, error } = await supabase
    .from('worker_profiles')
    .select(COLUNAS_ANUNCIO)
    .eq('profile_id', profileId)
    .maybeSingle<Anuncio>()

  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  if (!anuncio) return { perfil, anuncio: null, categoriaIds: [] }

  const categoriaLinhas = desembrulhar<Array<{ category_id: string }>>(
    await supabase.from('worker_categories').select('category_id').eq('worker_profile_id', anuncio.id),
  )
  return { perfil, anuncio, categoriaIds: categoriaLinhas.map((linha) => linha.category_id) }
}

export type DadosAnuncio = {
  descricao: string
  precoMedioCentavos: number
  unidadePreco: UnidadePreco
  raioAtendimentoKm: number
  bairro: string
  cidade: string
  uf: string
  coordenada: { lat: number; lon: number } | null
}

/** Cria ou atualiza o anúncio (upsert por `profile_id`, que é único). */
export async function salvarAnuncio(profileId: string, dados: DadosAnuncio): Promise<Anuncio> {
  const payload: Insercao<'worker_profiles'> = {
    profile_id: profileId,
    descricao: dados.descricao,
    preco_medio_centavos: dados.precoMedioCentavos,
    unidade_preco: dados.unidadePreco,
    raio_atendimento_km: dados.raioAtendimentoKm,
    bairro: dados.bairro,
    cidade: dados.cidade,
    uf: dados.uf,
  }
  // `location` é geography(Point,4326): o Postgres aceita o texto WKT direto
  // na escrita (SRID 4326 é o default do tipo da coluna). Nunca é lido de
  // volta — só gravado aqui.
  if (dados.coordenada) {
    ;(payload as { location?: unknown }).location = `POINT(${dados.coordenada.lon} ${dados.coordenada.lat})`
  }

  return desembrulhar<Anuncio>(
    await supabase
      .from('worker_profiles')
      .upsert(payload, { onConflict: 'profile_id' })
      .select(COLUNAS_ANUNCIO)
      .single(),
  )
}

/** Substitui o conjunto de categorias do anúncio (T02.3). */
export async function definirCategorias(workerProfileId: string, categoriaIds: string[]): Promise<void> {
  const { error: erroApagar } = await supabase
    .from('worker_categories')
    .delete()
    .eq('worker_profile_id', workerProfileId)
  if (erroApagar) {
    console.error('[supabase]', erroApagar)
    throw new ErroDeAplicacao(traduzirErro(erroApagar))
  }

  if (categoriaIds.length === 0) return

  const { error: erroInserir } = await supabase
    .from('worker_categories')
    .insert(categoriaIds.map((category_id) => ({ worker_profile_id: workerProfileId, category_id })))
  if (erroInserir) {
    console.error('[supabase]', erroInserir)
    throw new ErroDeAplicacao(traduzirErro(erroInserir))
  }
}

/** Ativa ou desativa o anúncio. A constraint `perfil_ativo_esta_completo`
 *  barra a ativação de um anúncio incompleto — o erro já vem traduzido
 *  (ver POR_CONSTRAINT em lib/erros.ts). */
export async function definirAtivo(workerProfileId: string, ativo: boolean): Promise<void> {
  exigirLinha(await supabase.from('worker_profiles').update({ ativo }).eq('id', workerProfileId).select())
}

// ---------------------------------------------------------------------------
// Foto de perfil (T02.2)
// ---------------------------------------------------------------------------

const TAMANHO_MAXIMO_MB = 5
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']

export function validarArquivoDeFoto(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Envie uma imagem JPEG, PNG ou WebP.'
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return `A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`
  return null
}

/** Redimensiona no navegador antes do upload — evita subir uma foto de
 *  12MB direto da câmera pra exibir um círculo de 88px. Canvas nativo, sem
 *  biblioteca extra. Se o canvas falhar por algum motivo, sobe o original: a
 *  foto grande é pior que travar o cadastro. */
async function redimensionar(arquivo: File, ladoMaximo = 480): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo)
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
    const largura = Math.max(1, Math.round(bitmap.width * escala))
    const altura = Math.max(1, Math.round(bitmap.height * escala))

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) return arquivo

    contexto.drawImage(bitmap, 0, 0, largura, altura)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    return blob ?? arquivo
  } catch (erro) {
    console.warn('[foto] redimensionamento falhou, enviando original', erro)
    return arquivo
  }
}

/** Envia a foto para o bucket `avatars` e atualiza `profiles.avatar_url`.
 *  Retorna a URL pública. */
export async function enviarFotoDePerfil(profileId: string, arquivo: File): Promise<string> {
  const erroValidacao = validarArquivoDeFoto(arquivo)
  if (erroValidacao) throw new ErroDeAplicacao(erroValidacao)

  const blob = await redimensionar(arquivo)
  // Nome com timestamp: evita que a CDN sirva a foto antiga em cache depois
  // de trocar (upsert:false também barra colisão de nome, mas o timestamp já
  // torna a colisão praticamente impossível).
  const caminho = `${profileId}/${Date.now()}.webp`

  const { error: erroUpload } = await supabase.storage
    .from('avatars')
    .upload(caminho, blob, { contentType: 'image/webp', upsert: false })
  if (erroUpload) {
    console.error('[supabase-storage]', erroUpload)
    throw new ErroDeAplicacao('Não foi possível enviar a foto. Tente novamente.')
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)

  exigirLinha(await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profileId).select())

  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Endereço (T02.5) — CEP via ViaCEP, coordenada via geocoding
// ---------------------------------------------------------------------------

export type EnderecoPorCep = {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

/** Consulta o ViaCEP (público, sem chave) e devolve o endereço. */
export async function buscarEnderecoPorCep(cepBruto: string): Promise<EnderecoPorCep> {
  const cep = cepBruto.replace(/\D/g, '')
  if (cep.length !== 8) throw new ErroDeAplicacao('CEP precisa ter 8 dígitos.')

  let resposta: Response
  try {
    resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  } catch {
    throw new ErroDeAplicacao('Não conseguimos consultar o CEP. Verifique sua internet e tente de novo.')
  }
  if (!resposta.ok) {
    throw new ErroDeAplicacao('Não conseguimos consultar o CEP agora. Tente de novo em instantes.')
  }

  const dados = (await resposta.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
  if (dados.erro) throw new ErroDeAplicacao('CEP não encontrado.')

  return {
    cep,
    logradouro: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    uf: dados.uf ?? '',
  }
}

/**
 * Converte endereço em coordenada — provisório (T02.5).
 *
 * Usa o Nominatim público (OpenStreetMap): gratuito e sem chave. Isso não é
 * a decisão final de provedor — essa é a T03.2, que a T00.9 já pesquisou e
 * recomendou Mapbox pelo tier gratuito maior (100k/mês). A diferença é que
 * Mapbox exige chave, e chave de geocoding não pode viver no cliente (ver
 * .env.example, seção "NUNCA coloque aqui") — precisaria de uma Edge
 * Function que a T03.2 ainda não montou. Nominatim resolve o presente sem
 * violar essa regra. Quando a T03.2 entrar, só esta função muda; quem chama
 * (`salvarAnuncio`) não sabe nem precisa saber qual provedor está por trás.
 * Detalhado em docs/geocoding-provisorio.md.
 */
export async function geocodificarEndereco(enderecoTexto: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', enderecoTexto)
  url.searchParams.set('countrycodes', 'br')
  url.searchParams.set('limit', '1')

  let resposta: Response
  try {
    resposta = await fetch(url.toString())
  } catch {
    return null
  }
  if (!resposta.ok) return null

  const resultados = (await resposta.json()) as Array<{ lat: string; lon: string }>
  const primeiro = resultados[0]
  if (!primeiro) return null

  const lat = Number(primeiro.lat)
  const lon = Number(primeiro.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null
  return { lat, lon }
}

// ---------------------------------------------------------------------------
// Página pública (T02.6)
// ---------------------------------------------------------------------------

export type AnuncioPublico = {
  perfil: { id: string; nome: string; avatarUrl: string | null }
  anuncio: Pick<
    Anuncio,
    | 'id'
    | 'descricao'
    | 'preco_medio_centavos'
    | 'unidade_preco'
    | 'raio_atendimento_km'
    | 'bairro'
    | 'cidade'
    | 'uf'
    | 'verificado_ate'
  >
  categorias: Categoria[]
}

/**
 * Busca o anúncio público de um profissional pelo `profile_id`.
 *
 * Devolve `null` quando o perfil não existe OU quando existe mas não tem
 * anúncio ativo — a policy "anuncio ativo e publico" já filtra isso no
 * banco, então um `null` aqui significa sempre "não há nada pra mostrar",
 * nunca "erro". Nunca inclui telefone nem coordenada: essas colunas nem
 * estão no GRANT de select (ver RLS), então nunca aparecem aqui.
 */
export async function buscarAnuncioPublico(profileId: string): Promise<AnuncioPublico | null> {
  const perfil = await buscarPerfilBasico(profileId)
  if (!perfil) return null

  const { data: anuncio, error: erroAnuncio } = await supabase
    .from('worker_profiles')
    .select(
      'id, descricao, preco_medio_centavos, unidade_preco, raio_atendimento_km, bairro, cidade, uf, verificado_ate',
    )
    .eq('profile_id', profileId)
    .eq('ativo', true)
    .maybeSingle()
  if (erroAnuncio) {
    console.error('[supabase]', erroAnuncio)
    throw new ErroDeAplicacao(traduzirErro(erroAnuncio))
  }
  if (!anuncio) return null

  const categoriaLinhas = desembrulhar<Array<{ categories: Categoria | null }>>(
    await supabase.from('worker_categories').select('categories(*)').eq('worker_profile_id', anuncio.id),
  )
  const categorias = categoriaLinhas.map((linha) => linha.categories).filter((c): c is Categoria => c !== null)

  return {
    perfil,
    anuncio,
    categorias,
  }
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const FORMATADOR_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const RUBRICA_UNIDADE: Record<UnidadePreco, string> = {
  hora: '/hora',
  diaria: '/diária',
  servico: '/serviço',
}

export function formatarPreco(centavos: number, unidade: UnidadePreco): string {
  return `${FORMATADOR_BRL.format(centavos / 100)}${RUBRICA_UNIDADE[unidade]}`
}
