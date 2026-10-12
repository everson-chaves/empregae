import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../lib/auth'
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
export default function Contratacoes() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [contratacoes, setContratacoes] = useState<BookingComOutroLado[]>([])
  const [volumeCentavos, setVolumeCentavos] = useState(0)
  const [filtro, setFiltro] = useState<FiltroStatusContratacao>('todos')
  const [erro, setErro] = useState<string | null>(null)

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
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
