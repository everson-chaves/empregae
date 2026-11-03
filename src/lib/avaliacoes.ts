import { supabase, type Linha } from './supabase'
import { desembrulhar, ErroDeAplicacao, traduzirErro } from './erros'

// E06 — Avaliações verificadas (T06.1 a T06.5).
//
// A trava estrutural (T06.1) não mora aqui: ela já está no banco desde a
// T00.2/T00.4 — reviews.booking_id é NOT NULL + UNIQUE + on delete restrict
// (supabase/migrations/20260901120200_*), e a RLS "so o cliente avalia, e
// so apos concluir" (20260911100000_rls.sql) usa pode_avaliar(booking_id)
// pra barrar qualquer avaliação sem contratação concluída, mesmo que esta
// camada tente. O roteiro que prova isso contra um Postgres de verdade está
// em docs/avaliacoes-teste-rls.md.
//
// O que esta epic acrescenta é T06.2 (formulário), T06.3 (estatísticas e
// lista) e T06.5 (denúncia) — T06.4 (lembrete) é inteiramente servidor
// (pg_cron + notification_events, ver a migration 20261103120100 e
// supabase/functions/processar-notificacoes), sem nada pra chamar daqui.

export type Review = Linha<'reviews'>

export type EstatisticasAvaliacoes = {
  notaMedia: number | null
  total: number
}

export type AvaliacaoComAutor = {
  id: string
  nota: number
  comentario: string | null
  createdAt: string
  autorNome: string
}

// ---------------------------------------------------------------------------
// T06.2 — Formulário de avaliação
// ---------------------------------------------------------------------------

/** Busca a avaliação já feita para uma contratação, se existir — usada
 *  pra decidir, no histórico (Contratacoes.tsx), entre mostrar "Avaliar" ou
 *  a avaliação já registrada. Reviews são públicas (select liberado a
 *  anon/authenticated), então isto não depende de quem está logado. */
export async function buscarAvaliacaoDaContratacao(bookingId: string): Promise<Review | null> {
  const { data, error } = await supabase.from('reviews').select('*').eq('booking_id', bookingId).maybeSingle()
  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return data
}

/** Mesma busca que `buscarAvaliacaoDaContratacao`, só que em lote — evita
 *  N requisições ao montar a lista inteira do histórico de contratações. */
export async function buscarAvaliacoesPorContratacoes(bookingIds: string[]): Promise<Map<string, Review>> {
  if (bookingIds.length === 0) return new Map()
  const linhas = desembrulhar<Review[]>(
    await supabase.from('reviews').select('*').in('booking_id', bookingIds),
  )
  return new Map(linhas.map((review) => [review.booking_id, review]))
}

/**
 * Registra a avaliação (T06.2: "liberado só após conclusão"). Quem garante
 * isso de verdade é a RLS (pode_avaliar) — esta função só valida o que é
 * regra de formulário (nota de 1 a 5), nunca "é cliente?" ou "já concluiu?",
 * porque confiar nisso aqui seria confiar no cliente JavaScript para uma
 * trava que já existe, estrutural, no banco.
 */
export async function avaliarContratacao(params: {
  bookingId: string
  autorId: string
  nota: number
  comentario: string
}): Promise<Review> {
  const { bookingId, autorId, nota, comentario } = params

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new ErroDeAplicacao('A nota precisa ser de 1 a 5.')
  }

  const comentarioLimpo = comentario.trim() || null
  if (comentarioLimpo && comentarioLimpo.length > 2000) {
    throw new ErroDeAplicacao('O comentário pode ter até 2000 caracteres.')
  }

  return desembrulhar<Review>(
    await supabase
      .from('reviews')
      .insert({ booking_id: bookingId, autor_id: autorId, nota, comentario: comentarioLimpo })
      .select('*')
      .single(),
  )
}

// ---------------------------------------------------------------------------
// T06.3 — Exibição (estatísticas e lista paginada)
// ---------------------------------------------------------------------------

/** Média e total de avaliações de um profissional (perfil e busca). Chama
 *  a RPC `estatisticas_avaliacoes` — tem que ser SECURITY DEFINER porque o
 *  cálculo passa por bookings/conversations, que a RLS só libera pros dois
 *  participantes, e quem consulta isto é qualquer visitante. */
export async function buscarEstatisticasAvaliacoes(workerProfileId: string): Promise<EstatisticasAvaliacoes> {
  const { data, error } = await supabase
    .rpc('estatisticas_avaliacoes', { p_worker_profile_id: workerProfileId })
    .single()

  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }

  return { notaMedia: data?.nota_media ?? null, total: data?.total_avaliacoes ?? 0 }
}

export const TAMANHO_PAGINA_AVALIACOES = 10

/** Lista paginada das avaliações de um profissional, mais recente primeiro
 *  — "nenhuma avaliação fixa no código" (T06.3): isto é sempre o que a
 *  tela de perfil mostra, nunca um placeholder de exemplo. */
export async function listarAvaliacoesProfissional(
  workerProfileId: string,
  pagina = 0,
): Promise<AvaliacaoComAutor[]> {
  const { data, error } = await supabase.rpc('listar_avaliacoes_profissional', {
    p_worker_profile_id: workerProfileId,
    p_limite: TAMANHO_PAGINA_AVALIACOES,
    p_offset: pagina * TAMANHO_PAGINA_AVALIACOES,
  })

  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    nota: linha.nota,
    comentario: linha.comentario,
    createdAt: linha.created_at,
    autorNome: linha.autor_nome,
  }))
}

// ---------------------------------------------------------------------------
// T06.5 — Denúncia de avaliação
// ---------------------------------------------------------------------------

/** Marca a avaliação para moderação. A RPC é a única porta de escrita que
 *  um usuário comum tem sobre `reviews` — só altera `denunciada`, nunca
 *  nota/comentário (ver a migration). Entra na fila do admin (E09, ainda
 *  não implementado) — a "fila" é a própria coluna `denunciada = true`. */
export async function denunciarAvaliacao(reviewId: string): Promise<void> {
  const { error } = await supabase.rpc('denunciar_avaliacao', { p_review_id: reviewId })
  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export function formatarNotaMedia(notaMedia: number | null): string {
  return notaMedia === null ? '—' : notaMedia.toFixed(1)
}

export function formatarDataAvaliacao(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}
