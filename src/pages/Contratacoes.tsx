import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import {
  avaliarContratacao,
  buscarAvaliacoesPorContratacoes,
  formatarDataAvaliacao,
  type Review,
} from '../lib/avaliacoes'
import {
  listarMinhasContratacoes,
  buscarVolumeTransacionado,
  formatarValorContratacao,
  formatarDataServico,
  RUBRICA_STATUS_BOOKING,
  type BookingComOutroLado,
  type FiltroStatusContratacao,
} from '../lib/contratacao'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'pronto' | 'erro'

const FILTROS: { valor: FiltroStatusContratacao; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todas' },
  { valor: 'proposto', rotulo: 'Propostas' },
  { valor: 'aceito', rotulo: 'Aceitas' },
  { valor: 'concluido', rotulo: 'Concluídas' },
  { valor: 'cancelado', rotulo: 'Canceladas' },
]

// T05.5 — Histórico (lista para cliente e profissional, filtro por status)
// e T05.6 — Métrica de volume transacionado (soma das concluídas, sem
// processar pagamento nenhum — é leitura do que já foi registrado pelo
// cartão de contratação dentro da conversa, E05 em Conversa.tsx).
type AvaliarModalProps = {
  nomeOutroLado: string
  onFechar: () => void
  onEnviar: (nota: number, comentario: string) => Promise<void>
}

/** T06.2 — Formulário de avaliação. Mesmo padrão de <dialog> já usado em
 *  PerfilProfissional.tsx (BriefingModal, DenunciaModal) — nota de 1 a 5
 *  como botões de estrela, comentário opcional. */
function AvaliarModal({ nomeOutroLado, onFechar, onEnviar }: AvaliarModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function fechar() {
    dialogRef.current?.close()
    onFechar()
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (nota < 1 || nota > 5) {
      setErro('Escolha uma nota de 1 a 5 estrelas.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await onEnviar(nota, comentario)
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível registrar sua avaliação.')
      setEnviando(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="profile-modal" onClose={onFechar}>
      <div className="profile-detail">
        <button type="button" className="close-button" onClick={fechar} aria-label="Fechar">
          ×
        </button>
        <h2>Avaliar {nomeOutroLado}</h2>
        <p>Sua avaliação é pública e não pode ser editada depois de enviada.</p>

        <form className="briefing-form" onSubmit={aoEnviar}>
          {erro && <p className="form-alerta">{erro}</p>}

          <div className="rating-picker">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                className={valor <= nota ? 'is-selected' : ''}
                aria-label={`${valor} estrela${valor > 1 ? 's' : ''}`}
                onClick={() => setNota(valor)}
              >
                {valor <= nota ? '★' : '☆'}
              </button>
            ))}
          </div>

          <label>
            Comentário (opcional)
            <textarea value={comentario} onChange={(evento) => setComentario(evento.target.value)} rows={4} />
          </label>

          <button type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar avaliação'}
          </button>
        </form>
      </div>
    </dialog>
  )
}

export default function Contratacoes() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [contratacoes, setContratacoes] = useState<BookingComOutroLado[]>([])
  const [volumeCentavos, setVolumeCentavos] = useState(0)
  const [filtro, setFiltro] = useState<FiltroStatusContratacao>('todos')
  const [erro, setErro] = useState<string | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Map<string, Review>>(new Map())
  const [bookingParaAvaliar, setBookingParaAvaliar] = useState<BookingComOutroLado | null>(null)

  useEffect(() => {
    if (carregandoSessao || !sessao) return
    let ativo = true

    Promise.all([listarMinhasContratacoes(sessao.user.id, filtro), buscarVolumeTransacionado(sessao.user.id)])
      .then(([listaContratacoes, volume]) => {
        if (!ativo) return
        setContratacoes(listaContratacoes)
        setVolumeCentavos(volume)
        setEstado('pronto')
      })
      .catch((erroCapturado) => {
        if (!ativo) return
        setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível carregar suas contratações.')
        setEstado('erro')
      })

    return () => {
      ativo = false
    }
  }, [carregandoSessao, sessao, filtro])

  // T06.2/T06.3 — depende da lista acima (precisa dos ids das contratações
  // concluídas) pra saber quais já têm avaliação: mostrar "Avaliar" ou o
  // que já foi registrado.
  useEffect(() => {
    const idsConcluidos = contratacoes.filter((b) => b.status === 'concluido').map((b) => b.id)
    if (idsConcluidos.length === 0) return

    let ativo = true
    buscarAvaliacoesPorContratacoes(idsConcluidos).then((mapa) => {
      if (ativo) setAvaliacoes(mapa)
    })
    return () => {
      ativo = false
    }
  }, [contratacoes])

  async function aoEnviarAvaliacao(nota: number, comentario: string) {
    if (!sessao || !bookingParaAvaliar) return
    const nova = await avaliarContratacao({
      bookingId: bookingParaAvaliar.id,
      autorId: sessao.user.id,
      nota,
      comentario,
    })
    setAvaliacoes((atual) => new Map(atual).set(nova.booking_id, nova))
    setBookingParaAvaliar(null)
  }

  if (carregandoSessao || estado === 'carregando') return null

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 720 }}>
        <div className="section-heading">
          <h2>Contratações</h2>
        </div>

        <div className="contratacoes-resumo">
          <span>Total transacionado (contratações concluídas)</span>
          <strong>{formatarValorContratacao(volumeCentavos)}</strong>
        </div>

        <div className="contratacoes-filtros">
          {FILTROS.map((item) => (
            <button
              key={item.valor}
              type="button"
              className={`category-button ${filtro === item.valor ? 'is-active' : ''}`}
              onClick={() => setFiltro(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        {estado === 'erro' && <p className="form-alerta">{erro}</p>}

        {estado === 'pronto' && contratacoes.length === 0 && (
          <p className="empty-state">Nenhuma contratação por aqui ainda. Proponha uma dentro de uma conversa.</p>
        )}

        {contratacoes.length > 0 && (
          <ul className="conversas-lista">
            {contratacoes.map((booking) => (
              <li key={booking.id}>
                <Link to={`/conversas/${booking.conversation_id}`} className="conversa-item">
                  <div className="avatar">
                    {booking.outroAvatarUrl ? (
                      <img className="avatar-img" src={booking.outroAvatarUrl} alt="" />
                    ) : (
                      <span className="avatar-fallback">{booking.outroNome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="conversa-item-corpo">
                    <div className="conversa-item-topo">
                      <strong>{booking.outroNome}</strong>
                      <span className="conversa-item-hora">{formatarDataServico(booking.data_servico)}</span>
                    </div>
                    <p>
                      {formatarValorContratacao(booking.valor_combinado_centavos)} · {booking.souCliente ? 'como cliente' : 'como profissional'}
                    </p>
                  </div>
                  <span className={`contratacao-status contratacao-status-${booking.status}`}>
                    {RUBRICA_STATUS_BOOKING[booking.status]}
                  </span>
                </Link>

                {booking.status === 'concluido' &&
                  (avaliacoes.has(booking.id) ? (
                    <div className="review">
                      <strong>{'⭐'.repeat(avaliacoes.get(booking.id)!.nota)}</strong>
                      {avaliacoes.get(booking.id)!.comentario && <span>{avaliacoes.get(booking.id)!.comentario}</span>}
                      <span>Avaliado em {formatarDataAvaliacao(avaliacoes.get(booking.id)!.created_at)}</span>
                    </div>
                  ) : (
                    booking.souCliente && (
                      <button type="button" className="ghost-button" onClick={() => setBookingParaAvaliar(booking)}>
                        Avaliar {booking.outroNome}
                      </button>
                    )
                  ))}
              </li>
            ))}
          </ul>
        )}
      </article>

      {bookingParaAvaliar && (
        <AvaliarModal
          nomeOutroLado={bookingParaAvaliar.outroNome}
          onFechar={() => setBookingParaAvaliar(null)}
          onEnviar={aoEnviarAvaliacao}
        />
      )}
    </section>
  )
}
