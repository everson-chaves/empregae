import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { exigirLinha, ErroDeAplicacao, traduzirErro } from './erros'

// E09 — Painel admin (T09.1 a T09.5).
//
// T09.1 (papel de admin, RLS, eh_admin()) já existe desde a T00.4 — ver
// supabase/migrations/20260911100000_rls.sql. O que esta epic acrescenta é
// a aplicação: o hook useEhAdmin (decide se deixa a pessoa entrar em
// /admin), a fila de verificação (T09.2), a moderação (T09.3) e as
// métricas do piloto (T09.4/T09.5). O teste que prova que um usuário comum
// não entra está em docs/admin-teste-rls.md.

// ---------------------------------------------------------------------------
// T09.1 — Acesso restrito
// ---------------------------------------------------------------------------

export type EstadoAdmin = 'carregando' | 'admin' | 'comum'

/** Chama a RPC eh_admin() — disponível a qualquer authenticated (sem
 *  revoke), só devolve um boolean sobre o PRÓPRIO caller. Admin.tsx usa
 *  isto para decidir se renderiza o painel ou redireciona — a trava de
 *  verdade é a RLS/checagem eh_admin() de cada tabela e função abaixo, não
 *  esta checagem de UI (um usuário comum que force a URL não ganha acesso
 *  a nenhum dado só porque passou por aqui — ver docs/admin-teste-rls.md). */
export function useEhAdmin(): EstadoAdmin {
  const [estado, setEstado] = useState<EstadoAdmin>('carregando')

  useEffect(() => {
    let ativo = true
    supabase
      .rpc('eh_admin')
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) {
          console.error('[supabase-rpc]', error)
          setEstado('comum')
          return
        }
        setEstado(data ? 'admin' : 'comum')
      })
    return () => {
      ativo = false
    }
  }, [])

  return estado
}

// ---------------------------------------------------------------------------
// T09.2 — Fila de verificação
// ---------------------------------------------------------------------------

export type StatusVerificacaoAdmin = 'pendente' | 'aprovado' | 'reprovado'

export type VerificacaoNaFila = {
  id: string
  workerProfileId: string
  nomeProfissional: string
  status: StatusVerificacaoAdmin
  tipoDocumento: string | null
  observacao: string | null
  validade: string | null
  createdAt: string
}

type LinhaFilaVerificacao = {
  id: string
  worker_profile_id: string
  nome_profissional: string
  status: StatusVerificacaoAdmin
  tipo_documento: string | null
  observacao: string | null
  validade: string | null
  created_at: string
}

export async function listarFilaDeVerificacao(): Promise<VerificacaoNaFila[]> {
  const { data, error } = await supabase.rpc('admin_fila_verificacao')
  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return ((data ?? []) as LinhaFilaVerificacao[]).map((linha) => ({
    id: linha.id,
    workerProfileId: linha.worker_profile_id,
    nomeProfissional: linha.nome_profissional,
    status: linha.status,
    tipoDocumento: linha.tipo_documento,
    observacao: linha.observacao,
    validade: linha.validade,
    createdAt: linha.created_at,
  }))
}

/** T09.2 — gera a URL (válida por 1 minuto) para o admin ver o documento.
 *  Duas viagens: a RPC devolve o CAMINHO (documento_url tem select
 *  revogado de todo authenticated, T00.4 — só a função, SECURITY DEFINER,
 *  enxerga); createSignedUrl é quem de fato libera o ARQUIVO, e essa
 *  segunda chamada passa pela RLS de storage.objects, que já libera admin
 *  (T07.1, "admin le documentos de verificacao"). */
export async function abrirDocumentoDeVerificacao(verificationId: string): Promise<string> {
  const { data: caminho, error: erroRpc } = await supabase.rpc('admin_caminho_documento_verificacao', {
    p_verification_id: verificationId,
  })
  if (erroRpc) {
    console.error('[supabase-rpc]', erroRpc)
    throw new ErroDeAplicacao(traduzirErro(erroRpc))
  }
  if (!caminho) throw new ErroDeAplicacao('Esta verificação não tem documento.')

  const { data, error } = await supabase.storage.from('verificacoes').createSignedUrl(caminho, 60)
  if (error || !data) {
    console.error('[supabase-storage]', error)
    throw new ErroDeAplicacao('Não foi possível abrir o documento.')
  }
  return data.signedUrl
}

/**
 * Aprova ou reprova. Chama `update` direto em `verifications` — a RLS
 * "admin decide a verificacao" (T00.4) já é a trava real; um trigger
 * (`verifications_sincronizar_selo`, T09.2) propaga a validade pro selo em
 * `worker_profiles.verificado_ate` sozinho, e a notificação ao profissional
 * já sai pelo trigger da T08.3 — nada disso é responsabilidade desta função.
 */
export async function decidirVerificacao(params: {
  verificationId: string
  adminId: string
  status: 'aprovado' | 'reprovado'
  observacao: string
  validade: string | null
}): Promise<void> {
  const { verificationId, adminId, status, observacao, validade } = params
  if (status === 'aprovado' && !validade) {
    throw new ErroDeAplicacao('Defina a validade do selo para aprovar.')
  }

  exigirLinha(
    await supabase
      .from('verifications')
      .update({
        status,
        observacao: observacao.trim() || null,
        validade: status === 'aprovado' ? validade : null,
        revisado_por: adminId,
        revisado_em: new Date().toISOString(),
      })
      .eq('id', verificationId)
      .select(),
    'Você não tem permissão para decidir esta verificação, ou ela não existe mais.',
  )
}

// ---------------------------------------------------------------------------
// T09.3 — Moderação
// ---------------------------------------------------------------------------

export type DenunciaDeProfissional = {
  id: string
  workerProfileId: string
  nomeProfissional: string
  motivo: string
  resolvida: boolean
  createdAt: string
}

type LinhaDenunciaProfissional = {
  id: string
  worker_profile_id: string
  nome_profissional: string
  motivo: string
  resolvida: boolean
  created_at: string
}

export async function listarDenunciasDeProfissionais(): Promise<DenunciaDeProfissional[]> {
  const { data, error } = await supabase.rpc('admin_denuncias_profissionais')
  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return ((data ?? []) as LinhaDenunciaProfissional[]).map((linha) => ({
    id: linha.id,
    workerProfileId: linha.worker_profile_id,
    nomeProfissional: linha.nome_profissional,
    motivo: linha.motivo,
    resolvida: linha.resolvida,
    createdAt: linha.created_at,
  }))
}

export async function marcarDenunciaComoResolvida(reportId: string): Promise<void> {
  exigirLinha(
    await supabase.from('worker_reports').update({ resolvida: true }).eq('id', reportId).select(),
    'Você não tem permissão para resolver esta denúncia, ou ela não existe mais.',
  )
}

/** Suspender é `ativo = false` — o mesmo campo que o próprio profissional
 *  liga/desliga (T02.x); a diferença é só quem está autorizado a mexer
 *  (policy nova "admin suspende ou reativa perfil", T09.3). Reativar é a
 *  mesma função com `ativo = true`. */
export async function definirAtivoDoAnuncio(workerProfileId: string, ativo: boolean): Promise<void> {
  exigirLinha(
    await supabase.from('worker_profiles').update({ ativo }).eq('id', workerProfileId).select(),
    'Você não tem permissão para alterar este anúncio, ou ele não existe mais.',
  )
}

export type AvaliacaoDenunciada = {
  id: string
  nota: number
  comentario: string | null
  oculta: boolean
  createdAt: string
  nomeAutor: string
  nomeProfissional: string
}

type LinhaAvaliacaoDenunciada = {
  id: string
  nota: number
  comentario: string | null
  oculta: boolean
  created_at: string
  nome_autor: string
  nome_profissional: string
}

export async function listarAvaliacoesDenunciadas(): Promise<AvaliacaoDenunciada[]> {
  const { data, error } = await supabase.rpc('admin_avaliacoes_denunciadas')
  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return ((data ?? []) as LinhaAvaliacaoDenunciada[]).map((linha) => ({
    id: linha.id,
    nota: linha.nota,
    comentario: linha.comentario,
    oculta: linha.oculta,
    createdAt: linha.created_at,
    nomeAutor: linha.nome_autor,
    nomeProfissional: linha.nome_profissional,
  }))
}

/** `oculta` (T09.3) é o que de fato tira a avaliação da vista pública e da
 *  média (estatisticas_avaliacoes/listar_avaliacoes_profissional/
 *  buscar_profissionais já filtram por ela) — diferente de `denunciada`
 *  (T06.5), que só marcou a entrada nesta fila. */
export async function definirVisibilidadeDaAvaliacao(reviewId: string, oculta: boolean): Promise<void> {
  exigirLinha(
    await supabase.from('reviews').update({ oculta }).eq('id', reviewId).select(),
    'Você não tem permissão para moderar esta avaliação, ou ela não existe mais.',
  )
}

// ---------------------------------------------------------------------------
// T09.4 — Dashboard de métricas do piloto · T09.5 — Exportação
// ---------------------------------------------------------------------------

export type MetricasPiloto = {
  profissionaisNaPraca: number
  densidadeMedia5km: number | null
  percentualBuscasCom5Mais: number | null
  contratacoesTotal: number
  contratacoesConcluidas: number
  adesaoVerificacaoPercentual: number | null
  tempoMedianoRespostaHoras: number | null
}

export async function buscarMetricasPiloto(): Promise<MetricasPiloto> {
  const { data, error } = await supabase.rpc('admin_metricas_piloto').single()
  if (error) {
    console.error('[supabase-rpc]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  return {
    profissionaisNaPraca: data.profissionais_na_praca,
    densidadeMedia5km: data.densidade_media_5km,
    percentualBuscasCom5Mais: data.percentual_buscas_com_5_mais,
    contratacoesTotal: data.contratacoes_total,
    contratacoesConcluidas: data.contratacoes_concluidas,
    adesaoVerificacaoPercentual: data.adesao_verificacao_percentual,
    tempoMedianoRespostaHoras: data.tempo_mediano_resposta_horas,
  }
}

const RUBRICAS_METRICAS: Record<keyof MetricasPiloto, string> = {
  profissionaisNaPraca: 'Profissionais na praça',
  densidadeMedia5km: 'Densidade média num raio de 5km',
  percentualBuscasCom5Mais: '% de buscas com 5 ou mais resultados',
  contratacoesTotal: 'Contratações (total)',
  contratacoesConcluidas: 'Contratações concluídas',
  adesaoVerificacaoPercentual: '% de adesão à verificação',
  tempoMedianoRespostaHoras: 'Tempo mediano de 1ª resposta (horas)',
}

/** T09.5 — "alimenta direto o TCC e o slide de tração": CSV simples,
 *  montado no cliente a partir do mesmo dado que o dashboard já mostra —
 *  não existe fonte adicional nem RPC própria pra isto. */
export function montarCsvDeMetricas(metricas: MetricasPiloto): string {
  const linhas = [
    'metrica,valor',
    ...(Object.keys(RUBRICAS_METRICAS) as (keyof MetricasPiloto)[]).map((chave) => {
      const valor = metricas[chave]
      return `"${RUBRICAS_METRICAS[chave]}",${valor ?? ''}`
    }),
  ]
  return linhas.join('\n')
}

export function baixarCsvDeMetricas(metricas: MetricasPiloto): void {
  const csv = montarCsvDeMetricas(metricas)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `metricas-piloto-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const RUBRICA_STATUS_VERIFICACAO_ADMIN: Record<StatusVerificacaoAdmin, string> = {
  pendente: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
}

export function formatarPercentual(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1)}%`
}

export function formatarNumeroOuTraco(valor: number | null): string {
  return valor === null ? '—' : valor.toFixed(1)
}
