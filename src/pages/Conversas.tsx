import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import { listarMinhasConversas, formatarAtividadeRelativa, type ConversaResumo } from '../lib/chat'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'pronto' | 'erro'

// T04.4 — Lista de conversas, ordenada por atividade (mensagem mais
// recente primeiro; conversa sem mensagem nenhuma usa a data de criação).
// `listarMinhasConversas` já resolve "quem é o outro lado" e conta as não
// lidas — esta página só desenha o que vem de lá.
export default function Conversas() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (carregandoSessao || !sessao) return
    let ativo = true
    listarMinhasConversas(sessao.user.id)
      .then((resultado) => {
        if (!ativo) return
        setConversas(resultado)
        setEstado('pronto')
      })
      .catch((erroCapturado) => {
        if (!ativo) return
        setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível carregar suas conversas.')
        setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [carregandoSessao, sessao])

  if (carregandoSessao || estado === 'carregando') return null

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 720 }}>
        <div className="section-heading">
          <h2>Minhas conversas</h2>
        </div>

        {estado === 'erro' && <p className="form-alerta">{erro}</p>}

        {estado === 'pronto' && conversas.length === 0 && (
          <p className="empty-state">
            Você ainda não iniciou nenhuma conversa. Encontre um profissional na busca e clique em "Iniciar conversa".
          </p>
        )}

        {estado === 'pronto' && conversas.length > 0 && (
          <ul className="conversas-lista">
            {conversas.map((conversa) => (
              <li key={conversa.id}>
                <Link to={`/conversas/${conversa.id}`} className="conversa-item">
                  <div className="avatar">
                    {conversa.outroAvatarUrl ? (
                      <img className="avatar-img" src={conversa.outroAvatarUrl} alt="" />
                    ) : (
                      <span className="avatar-fallback">{conversa.outroNome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="conversa-item-corpo">
                    <div className="conversa-item-topo">
                      <strong>{conversa.outroNome}</strong>
                      <span className="conversa-item-hora">{formatarAtividadeRelativa(conversa.ultimaAtividadeEm)}</span>
                    </div>
                    <p>{conversa.ultimaMensagem ?? 'Conversa iniciada, sem mensagens ainda.'}</p>
                  </div>
                  {conversa.naoLidas > 0 && <span className="conversa-item-badge">{conversa.naoLidas}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
