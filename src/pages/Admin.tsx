import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import { formatarDataServico } from '../lib/contratacao'
import { ErroDeAplicacao } from '../lib/erros'
import {
  abrirDocumentoDeVerificacao,
  baixarCsvDeMetricas,
  buscarMetricasPiloto,
  decidirVerificacao,
  definirAtivoDoAnuncio,
  definirVisibilidadeDaAvaliacao,
  formatarNumeroOuTraco,
  formatarPercentual,
  listarAvaliacoesDenunciadas,
  listarDenunciasDeProfissionais,
  listarFilaDeVerificacao,
  marcarDenunciaComoResolvida,
  RUBRICA_STATUS_VERIFICACAO_ADMIN,
  useEhAdmin,
  type AvaliacaoDenunciada,
  type DenunciaDeProfissional,
  type MetricasPiloto,
  type StatusVerificacaoAdmin,
  type VerificacaoNaFila,
} from '../lib/admin'

// E09 — Painel admin (T09.1 a T09.5).
//
// A rota "admin/*" (App.tsx) é propositalmente wildcard: a divisão em três
// seções (fila de verificação, moderação, métricas) vira sub-rota de
// verdade aqui dentro, não aba de estado local — dá para linkar direto
// para /admin/moderacao, por exemplo, e o botão "voltar" do navegador
// funciona como esperado.
export default function Admin() {
  const estadoAdmin = useEhAdmin()

  // T09.1 — a trava real é a RLS/eh_admin() de cada chamada abaixo; isto só
  // evita mostrar a casca do painel por um instante para quem não é admin,
  // enquanto espera a primeira chamada falhar. O teste que prova que um
  // usuário comum não entra está em docs/admin-teste-rls.md.
  if (estadoAdmin === 'carregando') return null
  if (estadoAdmin === 'comum') return <Navigate to="/" replace />

  return (
    <div className="admin-pagina">
      <AbasAdmin />
      <Routes>
        <Route index element={<Navigate to="metricas" replace />} />
        <Route path="verificacao" element={<FilaDeVerificacao />} />
        <Route path="moderacao" element={<Moderacao />} />
        <Route path="metricas" element={<Metricas />} />
      </Routes>
    </div>
  )
}

const ABAS_ADMIN = [
  { caminho: '/admin/metricas', rotulo: 'Métricas' },
  { caminho: '/admin/verificacao', rotulo: 'Fila de verificação' },
  { caminho: '/admin/moderacao', rotulo: 'Moderação' },
]

function AbasAdmin() {
  const local = useLocation()
  return (
    <nav className="contratacoes-filtros">
      {ABAS_ADMIN.map((aba) => (
        <Link
          key={aba.caminho}
          to={aba.caminho}
          className={local.pathname === aba.caminho ? 'secondary-button button-like' : 'ghost-button button-like'}
        >
          {aba.rotulo}
        </Link>
      ))}
    </nav>
  )
}

const CLASSE_STATUS_VERIFICACAO: Record<StatusVerificacaoAdmin, string> = {
  pendente: 'status-tag-pendente',
  aprovado: 'status-tag-positivo',
  reprovado: 'status-tag-negativo',
}

// ---------------------------------------------------------------------------
// T09.2 — Fila de verificação
// ---------------------------------------------------------------------------

type EstadoCarregamento = 'carregando' | 'pronto' | 'erro'

function FilaDeVerificacao() {
  const { sessao } = useSessao()
  const [itens, setItens] = useState<VerificacaoNaFila[]>([])
  const [estado, setEstado] = useState<EstadoCarregamento>('carregando')
  const [emDecisao, setEmDecisao] = useState<VerificacaoNaFila | null>(null)

  // Mesmo padrão de Contratacoes.tsx/PerfilProfissional.tsx (E06): a busca
  // fica inline no efeito (nunca uma função nomeada chamada "a seco" dentro
  // dele) -- é isso, não um ajuste de estado, que o oxlint
  // react(set-state-in-effect) pede.
  useEffect(() => {
    let ativo = true
    listarFilaDeVerificacao()
      .then((lista) => {
        if (!ativo) return
        setItens(lista)
        setEstado('pronto')
      })
      .catch((erro) => {
        if (!ativo) return
        console.error('[admin]', erro)
        setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [])

  async function aoVerDocumento(verificationId: string) {
    try {
      const url = await abrirDocumentoDeVerificacao(verificationId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (erro) {
      // Ação secundária: falhar aqui não trava o resto da fila, só o
      // documento não abre (o popup bloqueado pelo navegador é o sinal
      // mais comum — não há como distinguir isso de uma falha real daqui).
      console.error('[admin]', erro)
    }
  }

  // Atualiza o item na lista local em vez de reconsultar a fila inteira —
  // decidirVerificacao já devolveu sucesso, e o novo estado é exatamente o
  // que foi enviado (mesma ideia de aoEnviarAvaliacao em Contratacoes.tsx).
  async function aoDecidir(status: 'aprovado' | 'reprovado', observacao: string, validade: string | null) {
    if (!emDecisao || !sessao) return
    await decidirVerificacao({ verificationId: emDecisao.id, adminId: sessao.user.id, status, observacao, validade })
    setItens((atual) =>
      atual.map((item) =>
        item.id === emDecisao.id
          ? { ...item, status, observacao: observacao.trim() || null, validade: status === 'aprovado' ? validade : null }
          : item,
      ),
    )
    setEmDecisao(null)
  }

  if (estado === 'carregando') return <p>Carregando fila de verificação…</p>
  if (estado === 'erro') return <p className="form-alerta">Não foi possível carregar a fila de verificação.</p>

  const pendentes = itens.filter((item) => item.status === 'pendente')

  return (
    <section>
      <div className="simple-section-title">
        <h2>Fila de verificação</h2>
        <span>
          {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
        </span>
      </div>

      {itens.length === 0 && <p className="empty-state">Nenhuma solicitação de verificação ainda.</p>}

      <div className="simple-list">
        {itens.map((item) => (
          <div key={item.id} className="contratacao-card">
            <div className="contratacao-card-topo">
              <strong>{item.nomeProfissional}</strong>
              <span className={`status-tag ${CLASSE_STATUS_VERIFICACAO[item.status]}`}>
                {RUBRICA_STATUS_VERIFICACAO_ADMIN[item.status]}
              </span>
            </div>
            <span>Enviado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
            {item.validade && <span>Selo válido até {formatarDataServico(item.validade)}</span>}
            {item.observacao && <span>Observação: {item.observacao}</span>}

            <div className="contratacao-acoes">
              <button type="button" className="ghost-button" onClick={() => aoVerDocumento(item.id)}>
                Ver documento
              </button>
              {item.status === 'pendente' && (
                <button type="button" className="secondary-button" onClick={() => setEmDecisao(item)}>
                  Decidir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {emDecisao && (
        <DecidirVerificacaoModal item={emDecisao} onFechar={() => setEmDecisao(null)} onDecidir={aoDecidir} />
      )}
    </section>
  )
}

type DecidirVerificacaoModalProps = {
  item: VerificacaoNaFila
  onFechar: () => void
  onDecidir: (status: 'aprovado' | 'reprovado', observacao: string, validade: string | null) => Promise<void>
}

/** T09.2 — aprovar exige validade (constraint `aprovado_tem_validade` no
 *  banco, T00.2); reprovar não. Mesmo padrão de <dialog> já usado em
 *  AvaliarModal (Contratacoes.tsx) e nos modais de PerfilProfissional.tsx. */
function DecidirVerificacaoModal({ item, onFechar, onDecidir }: DecidirVerificacaoModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [observacao, setObservacao] = useState(item.observacao ?? '')
  const [validade, setValidade] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function fechar() {
    dialogRef.current?.close()
    onFechar()
  }

  async function decidir(status: 'aprovado' | 'reprovado') {
    setErro(null)
    setEnviando(true)
    try {
      await onDecidir(status, observacao, status === 'aprovado' ? validade || null : null)
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível registrar a decisão.',
      )
      setEnviando(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="profile-modal" onClose={onFechar}>
      <div className="profile-detail">
        <button type="button" className="close-button" onClick={fechar} aria-label="Fechar">
          ×
        </button>
        <h2>Decidir verificação de {item.nomeProfissional}</h2>

        <form className="briefing-form" onSubmit={(evento) => evento.preventDefault()}>
          {erro && <p className="form-alerta">{erro}</p>}

          <label>
            Validade do selo (obrigatória para aprovar)
            <input type="date" value={validade} onChange={(evento) => setValidade(evento.target.value)} />
          </label>

          <label>
            Observação (opcional)
            <textarea value={observacao} onChange={(evento) => setObservacao(evento.target.value)} rows={3} />
          </label>

          <div className="contratacao-acoes">
            <button
              type="button"
              className="secondary-button"
              disabled={enviando}
              onClick={() => decidir('aprovado')}
            >
              Aprovar
            </button>
            <button type="button" className="danger-button" disabled={enviando} onClick={() => decidir('reprovado')}>
              Reprovar
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// T09.3 — Moderação
// ---------------------------------------------------------------------------

function Moderacao() {
  const [denuncias, setDenuncias] = useState<DenunciaDeProfissional[]>([])
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoDenunciada[]>([])
  const [suspensos, setSuspensos] = useState<Set<string>>(new Set())
  const [estado, setEstado] = useState<EstadoCarregamento>('carregando')

  // Mesmo padrão de Contratacoes.tsx/PerfilProfissional.tsx (E06): a busca
  // fica inline no efeito, nunca numa função nomeada chamada "a seco" --
  // é isso que o oxlint react(set-state-in-effect) pede.
  useEffect(() => {
    let ativo = true
    Promise.all([listarDenunciasDeProfissionais(), listarAvaliacoesDenunciadas()])
      .then(([listaDenuncias, listaAvaliacoes]) => {
        if (!ativo) return
        setDenuncias(listaDenuncias)
        setAvaliacoes(listaAvaliacoes)
        setEstado('pronto')
      })
      .catch((erro) => {
        if (!ativo) return
        console.error('[admin]', erro)
        setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [])

  // As três ações abaixo atualizam o estado local em vez de reconsultar as
  // duas listas inteiras -- a escrita já devolveu sucesso, e o novo estado
  // é exatamente o que foi pedido.

  async function aoSuspender(workerProfileId: string) {
    await definirAtivoDoAnuncio(workerProfileId, false)
    setSuspensos((atual) => new Set(atual).add(workerProfileId))
  }

  async function aoResolverDenuncia(reportId: string) {
    await marcarDenunciaComoResolvida(reportId)
    setDenuncias((atual) => atual.map((d) => (d.id === reportId ? { ...d, resolvida: true } : d)))
  }

  async function aoAlternarVisibilidade(reviewId: string, ocultaAtual: boolean) {
    await definirVisibilidadeDaAvaliacao(reviewId, !ocultaAtual)
    setAvaliacoes((atual) => atual.map((a) => (a.id === reviewId ? { ...a, oculta: !ocultaAtual } : a)))
  }

  if (estado === 'carregando') return <p>Carregando moderação…</p>
  if (estado === 'erro') return <p className="form-alerta">Não foi possível carregar a moderação.</p>

  return (
    <>
      <section>
        <div className="simple-section-title">
          <h2>Denúncias de profissional</h2>
        </div>

        {denuncias.length === 0 && <p className="empty-state">Nenhuma denúncia registrada.</p>}

        <div className="simple-list">
          {denuncias.map((denuncia) => (
            <div key={denuncia.id} className="contratacao-card">
              <div className="contratacao-card-topo">
                <strong>{denuncia.nomeProfissional}</strong>
                <span className={`status-tag ${denuncia.resolvida ? 'status-tag-positivo' : 'status-tag-pendente'}`}>
                  {denuncia.resolvida ? 'Resolvida' : 'Pendente'}
                </span>
              </div>
              <span>{denuncia.motivo}</span>
              <span>{new Date(denuncia.createdAt).toLocaleDateString('pt-BR')}</span>
              {suspensos.has(denuncia.workerProfileId) && <span>Perfil suspenso.</span>}
              {!denuncia.resolvida && (
                <div className="contratacao-acoes">
                  {!suspensos.has(denuncia.workerProfileId) && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => aoSuspender(denuncia.workerProfileId)}
                    >
                      Suspender perfil
                    </button>
                  )}
                  <button type="button" className="ghost-button" onClick={() => aoResolverDenuncia(denuncia.id)}>
                    Marcar como resolvida
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="simple-section-title">
          <h2>Avaliações denunciadas</h2>
        </div>

        {avaliacoes.length === 0 && <p className="empty-state">Nenhuma avaliação denunciada.</p>}

        <div className="simple-list">
          {avaliacoes.map((avaliacao) => (
            <div key={avaliacao.id} className="contratacao-card">
              <div className="contratacao-card-topo">
                <strong>
                  {'⭐'.repeat(avaliacao.nota)} · {avaliacao.nomeAutor} → {avaliacao.nomeProfissional}
                </strong>
                <span className={`status-tag ${avaliacao.oculta ? 'status-tag-negativo' : 'status-tag-pendente'}`}>
                  {avaliacao.oculta ? 'Oculta' : 'Visível'}
                </span>
              </div>
              {avaliacao.comentario && <span>{avaliacao.comentario}</span>}
              <span>{new Date(avaliacao.createdAt).toLocaleDateString('pt-BR')}</span>
              <div className="contratacao-acoes">
                <button
                  type="button"
                  className={avaliacao.oculta ? 'ghost-button' : 'danger-button'}
                  onClick={() => aoAlternarVisibilidade(avaliacao.id, avaliacao.oculta)}
                >
                  {avaliacao.oculta ? 'Reexibir' : 'Ocultar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// T09.4 — Dashboard de métricas do piloto · T09.5 — Exportação
// ---------------------------------------------------------------------------

function formatarHoras(horas: number | null): string {
  return horas === null ? '—' : `${horas.toFixed(1)}h`
}

function Metricas() {
  const [metricas, setMetricas] = useState<MetricasPiloto | null>(null)
  const [estado, setEstado] = useState<EstadoCarregamento>('carregando')

  useEffect(() => {
    let ativo = true
    buscarMetricasPiloto()
      .then((dados) => {
        if (!ativo) return
        setMetricas(dados)
        setEstado('pronto')
      })
      .catch((erro) => {
        console.error('[admin]', erro)
        if (ativo) setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [])

  if (estado === 'carregando') return <p>Carregando métricas…</p>
  if (estado === 'erro' || !metricas) return <p className="form-alerta">Não foi possível carregar as métricas.</p>

  return (
    <section>
      <div className="simple-section-title">
        <h2>Métricas do piloto</h2>
        <button type="button" className="ghost-button" onClick={() => baixarCsvDeMetricas(metricas)}>
          Exportar CSV
        </button>
      </div>

      <div className="metrics-band">
        <div>
          <strong>{metricas.profissionaisNaPraca}</strong>
          <span>Profissionais na praça</span>
        </div>
        <div>
          <strong>{formatarNumeroOuTraco(metricas.densidadeMedia5km)}</strong>
          <span>Densidade média num raio de 5km</span>
        </div>
        <div>
          <strong>{formatarPercentual(metricas.percentualBuscasCom5Mais)}</strong>
          <span>Buscas com 5+ resultados</span>
        </div>
        <div>
          <strong>
            {metricas.contratacoesConcluidas} / {metricas.contratacoesTotal}
          </strong>
          <span>Contratações concluídas / total</span>
        </div>
        <div>
          <strong>{formatarPercentual(metricas.adesaoVerificacaoPercentual)}</strong>
          <span>Adesão à verificação</span>
        </div>
        <div>
          <strong>{formatarHoras(metricas.tempoMedianoRespostaHoras)}</strong>
          <span>Tempo mediano de 1ª resposta</span>
        </div>
      </div>
    </section>
  )
}
