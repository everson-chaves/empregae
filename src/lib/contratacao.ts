import { supabase, type Linha, type Atualizacao } from './supabase'
import { desembrulhar, exigirLinha, ErroDeAplicacao, traduzirErro } from './erros'

// E05 — Registro de contratação (T05.1 a T05.6).
//
// Ciclo de status (status_booking): proposto -> aceito -> concluido, com
// cancelado alcançável a partir de proposto (recusar, T05.2) ou de aceito
// (cancelar, T05.4). concluido é terminal: a RLS de bookings permite update
// pelos dois participantes, então quem trava o terminal é a aplicação (não
// existe ação de UI para sair de 'concluido') e o check
// `conclusao_coerente_com_status` do banco, que não deixa reabrir sem apagar
// concluido_em.
//
// "Confirmação dos dois lados" (T05.3) não é um novo valor de enum: os dois
// lados marcam confirmado_cliente_em / confirmado_profissional_em, e só
// quando os DOIS já estão preenchidos esta camada grava status='concluido'
// na mesma chamada. Ver confirmarConclusao.

export type Booking = Linha<'bookings'>

export type BookingComOutroLado = Booking & {
  outroNome: string
  outroAvatarUrl: string | null
  souCliente: boolean
}

// ---------------------------------------------------------------------------
// T05.1 — Propor contratação
// ---------------------------------------------------------------------------

/** Impede propor uma contratação nova enquanto já existe uma em aberto
 *  (proposto ou aceito) para a mesma conversa — evita duas propostas
 *  concorrentes para o mesmo par. */
export async function buscarContratacaoEmAberto(conversationId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('conversation_id', conversationId)
    .in('status', ['proposto', 'aceito'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return data
}

export async function proporContratacao(params: {
  conversationId: string
  meuId: string
  valorCombinadoCentavos: number
  dataServico: string // yyyy-mm-dd
}): Promise<Booking> {
  const { conversationId, meuId, valorCombinadoCentavos, dataServico } = params

  if (!Number.isInteger(valorCombinadoCentavos) || valorCombinadoCentavos <= 0) {
    throw new ErroDeAplicacao('Informe um valor combinado válido.')
  }
  if (!dataServico) {
    throw new ErroDeAplicacao('Informe a data do serviço.')
  }

  const emAberto = await buscarContratacaoEmAberto(conversationId)
  if (emAberto) {
    throw new ErroDeAplicacao('Já existe uma contratação em andamento nesta conversa.')
  }

  return desembrulhar<Booking>(
    await supabase
      .from('bookings')
      .insert({
        conversation_id: conversationId,
        proposto_por: meuId,
        valor_combinado_centavos: valorCombinadoCentavos,
        data_servico: dataServico,
        status: 'proposto',
      })
      .select('*')
      .single(),
  )
}

// ---------------------------------------------------------------------------
// T05.2 — Aceitar ou recusar · T05.4 — Cancelar
// ---------------------------------------------------------------------------
// As duas ações usam a mesma transição de dados (status -> cancelado, com
// motivo e autor) porque o produto não distingue "recusei antes de aceitar"
// de "cancelei depois de aceito" no nível do banco — status_booking só tem
// um valor terminal de recusa/cancelamento. A UI que decide qual rótulo
// mostrar, conforme o status atual (ver Conversa.tsx).

export async function aceitarContratacao(bookingId: string): Promise<Booking> {
  const linhas = exigirLinha(
    await supabase
      .from('bookings')
      .update({ status: 'aceito' })
      .eq('id', bookingId)
      .eq('status', 'proposto')
      .select('*'),
    'Esta contratação não pode mais ser aceita.',
  )
  return linhas[0]
}

export async function recusarOuCancelarContratacao(params: {
  bookingId: string
  meuId: string
  statusAtual: Booking['status']
  motivo?: string
}): Promise<Booking> {
  const { bookingId, meuId, statusAtual, motivo } = params

  if (statusAtual !== 'proposto' && statusAtual !== 'aceito') {
    throw new ErroDeAplicacao('Esta contratação não pode mais ser cancelada.')
  }

  const motivoLimpo = motivo?.trim() || null

  const linhas = exigirLinha(
    await supabase
      .from('bookings')
      .update({ status: 'cancelado', cancelado_por: meuId, motivo_cancelamento: motivoLimpo })
      .eq('id', bookingId)
      .eq('status', statusAtual)
      .select('*'),
    'Esta contratação não pode mais ser cancelada.',
  )
  return linhas[0]
}

// ---------------------------------------------------------------------------
// T05.3 — Concluir (confirmação dos dois lados)
// ---------------------------------------------------------------------------

/**
 * Registra a confirmação do lado de quem chama. Se o outro lado já tinha
 * confirmado antes, esta mesma chamada fecha a contratação: grava
 * status='concluido', concluido_em=agora e concluido_por=quem confirmou por
 * último (é quem "destravou" a avaliação, na prática).
 *
 * Lida com a corrida óbvia (os dois confirmando quase ao mesmo tempo) soh
 * até onde esta camada consegue sem RPC dedicada: o filtro
 * `.eq('status', 'aceito')` garante que a transição para concluido não
 * acontece duas vezes, mas uma corrida de poucos milissegundos entre as duas
 * leituras de confirmado_* poderia, em tese, fazer os dois UPDATEs se
 * considerarem "o primeiro a confirmar". Risco aceito para o MVP1 — o pior
 * cenário é os dois ficarem marcados como confirmado sem fechar sozinho, e
 * uma nova tentativa de qualquer um dos lados fecha.
 */
export async function confirmarConclusao(params: {
  bookingId: string
  meuId: string
  souCliente: boolean
}): Promise<Booking> {
  const { bookingId, meuId, souCliente } = params

  const atual = desembrulhar<
    Pick<Booking, 'status' | 'confirmado_cliente_em' | 'confirmado_profissional_em'>
  >(
    await supabase
      .from('bookings')
      .select('status, confirmado_cliente_em, confirmado_profissional_em')
      .eq('id', bookingId)
      .single(),
  )

  if (atual.status !== 'aceito') {
    throw new ErroDeAplicacao('Só é possível concluir uma contratação aceita.')
  }

  const outroJaConfirmou = souCliente ? atual.confirmado_profissional_em !== null : atual.confirmado_cliente_em !== null

  const agora = new Date().toISOString()
  const payload: Atualizacao<'bookings'> = souCliente
    ? { confirmado_cliente_em: agora }
    : { confirmado_profissional_em: agora }

  if (outroJaConfirmou) {
    payload.status = 'concluido'
    payload.concluido_em = agora
    payload.concluido_por = meuId
  }

  const linhas = exigirLinha(
    await supabase.from('bookings').update(payload).eq('id', bookingId).eq('status', 'aceito').select('*'),
    'Não foi possível registrar sua confirmação.',
  )
  return linhas[0]
}

// ---------------------------------------------------------------------------
// T05.5 — Histórico
// ---------------------------------------------------------------------------

export type FiltroStatusContratacao = 'todos' | Booking['status']

export async function listarMinhasContratacoes(
  meuId: string,
  filtro: FiltroStatusContratacao = 'todos',
): Promise<BookingComOutroLado[]> {
  const conversas = desembrulhar<Array<{ id: string; client_id: string; worker_profile_id: string }>>(
    await supabase.from('conversations').select('id, client_id, worker_profile_id'),
  )
  if (conversas.length === 0) return []

  const conversaPorId = new Map(conversas.map((c) => [c.id, c]))

  let consulta = supabase
    .from('bookings')
    .select('*')
    .in('conversation_id', conversas.map((c) => c.id))
    .order('created_at', { ascending: false })

  if (filtro !== 'todos') consulta = consulta.eq('status', filtro)

  const bookings = desembrulhar<Booking[]>(await consulta)
  if (bookings.length === 0) return []

  const idsWorkerProfile = [...new Set(conversas.map((c) => c.worker_profile_id))]
  const workerProfiles = desembrulhar<Array<{ id: string; profile_id: string }>>(
    await supabase.from('worker_profiles').select('id, profile_id').in('id', idsWorkerProfile),
  )
  const profileIdPorWorkerProfile = new Map(workerProfiles.map((w) => [w.id, w.profile_id]))

  const idsOutroPerfil = bookings.map((b) => {
    const conversa = conversaPorId.get(b.conversation_id)
    if (!conversa) return null
    const souCliente = conversa.client_id === meuId
    return souCliente ? (profileIdPorWorkerProfile.get(conversa.worker_profile_id) ?? null) : conversa.client_id
  })
  const idsPerfilUnicos = [...new Set(idsOutroPerfil.filter((id): id is string => id !== null))]

  const perfis =
    idsPerfilUnicos.length > 0
      ? desembrulhar<Array<{ id: string; nome: string; avatar_url: string | null }>>(
          await supabase.from('profiles').select('id, nome, avatar_url').in('id', idsPerfilUnicos),
        )
      : []
  const perfilPorId = new Map(perfis.map((p) => [p.id, p]))

  return bookings.map((booking, indice) => {
    const conversa = conversaPorId.get(booking.conversation_id)
    const souCliente = conversa ? conversa.client_id === meuId : false
    const outroId = idsOutroPerfil[indice]
    const outro = outroId ? perfilPorId.get(outroId) : undefined
    return {
      ...booking,
      souCliente,
      outroNome: outro?.nome ?? 'Pessoa removida',
      outroAvatarUrl: outro?.avatar_url ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// T05.6 — Métrica de volume transacionado
// ---------------------------------------------------------------------------

/** Soma valor_combinado_centavos de todas as contratações concluídas em que
 *  `meuId` participa (como cliente ou como profissional) — sem processar
 *  pagamento nenhum, é só leitura do que já foi registrado. */
export async function buscarVolumeTransacionado(meuId: string): Promise<number> {
  const contratacoes = await listarMinhasContratacoes(meuId, 'concluido')
  return contratacoes.reduce((soma, b) => soma + b.valor_combinado_centavos, 0)
}

// ---------------------------------------------------------------------------
// Formatação e rótulos
// ---------------------------------------------------------------------------

const FORMATADOR_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarValorContratacao(centavos: number): string {
  return FORMATADOR_BRL.format(centavos / 100)
}

export function formatarDataServico(iso: string): string {
  // `date` do Postgres vem como yyyy-mm-dd puro (sem hora) — construir o
  // Date direto a partir da string trataria como UTC e poderia exibir o dia
  // anterior no fuso do Brasil. Parse manual evita o problema de fuso.
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR')
}

export const RUBRICA_STATUS_BOOKING: Record<Booking['status'], string> = {
  proposto: 'Proposto',
  aceito: 'Aceito',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}
