import { supabase, type Linha, type Enums } from './supabase'
import { desembrulhar, ErroDeAplicacao, traduzirErro } from './erros'

// E07 — Verificação e selo (T07.1 a T07.6).
//
// No piloto a aprovação é MANUAL, feita pelo admin fora desta epic (T09.2,
// Mês 4): esta camada só cobre o lado do profissional (enviar documento,
// acompanhar status, reenviar se reprovado) e o lado público (selo, escopo
// declarado, denúncia). Aprovar/reprovar não tem função aqui de propósito —
// a RLS de `verifications` ("admin decide a verificacao") já impede
// qualquer coisa além de admin fazer essa transição, e o app não tem tela
// de admin ainda.

export type Verification = Linha<'verifications'>
// Nunca selecionamos documento_url: nem a RLS concede select nessa coluna
// pra authenticated (T00.4) -- ver comentário em migrations/...rls.sql.
// Este tipo é o que a aplicação de fato manipula.
export type VerificationPublica = Omit<Verification, 'documento_url'>
export type StatusVerificacao = Enums['status_verificacao']

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'application/pdf']
const TAMANHO_MAXIMO_MB = 8

export function validarArquivoDocumento(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Envie uma imagem (JPEG/PNG) ou um PDF.'
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return `O arquivo precisa ter até ${TAMANHO_MAXIMO_MB}MB.`
  return null
}

// ---------------------------------------------------------------------------
// T07.2 — Solicitação pelo profissional (e reenvio, que é a mesma função:
// a RLS só permite inserir com status='pendente', então "reenviar" é
// simplesmente pedir de novo depois de uma reprovação).
// ---------------------------------------------------------------------------

export async function solicitarVerificacao(params: {
  workerProfileId: string
  arquivo: File
}): Promise<VerificationPublica> {
  const { workerProfileId, arquivo } = params

  const erroValidacao = validarArquivoDocumento(arquivo)
  if (erroValidacao) throw new ErroDeAplicacao(erroValidacao)

  const extensao = arquivo.type === 'application/pdf' ? 'pdf' : arquivo.type === 'image/png' ? 'png' : 'jpg'
  const caminho = `${workerProfileId}/${Date.now()}.${extensao}`

  const { error: erroUpload } = await supabase.storage
    .from('verificacoes')
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
  if (erroUpload) {
    console.error('[supabase-storage]', erroUpload)
    throw new ErroDeAplicacao('Não foi possível enviar o documento. Tente novamente.')
  }

  return desembrulhar<VerificationPublica>(
    await supabase
      .from('verifications')
      .insert({ worker_profile_id: workerProfileId, documento_url: caminho, tipo_documento: arquivo.type })
      .select('id, worker_profile_id, status, tipo_documento, revisado_por, revisado_em, validade, observacao, created_at')
      .single(),
  )
}

// ---------------------------------------------------------------------------
// Status atual — mais recente solicitação do profissional (pode haver mais
// de uma linha, uma por tentativa: a primeira reprovada, a segunda pendente
// etc. — a RLS lê todas as suas; esta função decide qual é "a atual").
// ---------------------------------------------------------------------------

export async function buscarMinhaVerificacaoAtual(workerProfileId: string): Promise<VerificationPublica | null> {
  const { data, error } = await supabase
    .from('verifications')
    .select('id, worker_profile_id, status, tipo_documento, revisado_por, revisado_em, validade, observacao, created_at')
    .eq('worker_profile_id', workerProfileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return data
}

// ---------------------------------------------------------------------------
// T07.3 — Selo: respeita verificado_ate (não o status da última
// verification — o selo some quando o prazo vence, mesmo que a última
// solicitação registrada ainda diga "aprovado").
// ---------------------------------------------------------------------------

export function temSeloAtivo(verificadoAte: string | null): boolean {
  if (!verificadoAte) return false
  return new Date(verificadoAte) >= new Date()
}

// ---------------------------------------------------------------------------
// T07.6 — Canal de denúncia
// ---------------------------------------------------------------------------

export async function denunciarProfissional(params: {
  workerProfileId: string
  motivo: string
  reporterId?: string
}): Promise<void> {
  const motivoLimpo = params.motivo.trim()
  if (motivoLimpo.length === 0) throw new ErroDeAplicacao('Descreva o motivo da denúncia.')

  const { error } = await supabase.from('worker_reports').insert({
    worker_profile_id: params.workerProfileId,
    motivo: motivoLimpo,
    reporter_id: params.reporterId ?? null,
  })
  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const RUBRICA_STATUS_VERIFICACAO: Record<StatusVerificacao, string> = {
  pendente: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
}
