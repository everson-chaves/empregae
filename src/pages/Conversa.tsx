import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSessao } from '../lib/auth'
import {
  buscarConversa,
  listarMensagens,
  enviarMensagem,
  marcarConversaComoLida,
  useMensagensRealtime,
  formatarHorarioMensagem,
  PAGINA_MENSAGENS,
  type ParticipanteConversa,
  type Message,
  type Briefing,
} from '../lib/chat'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'pronto' | 'nao-encontrada' | 'erro'

// T04.1 (briefing) e T04.2 (mensagens) nesta mesma tela: o briefing é o
// contexto fixo do topo (por que essa conversa começou), as mensagens são o
// histórico que cresce por baixo. T04.3 (realtime) só acopla uma assinatura
// por cima do que já é uma lista normal em estado do React — nenhuma
// mensagem nova, sua ou do outro lado, deixa de passar pelo mesmo `mensagens`.
//
// T04.5 (RLS do chat) não tem como ser testada de ponta a ponta aqui: não há
// Supabase local neste ambiente. `docs/chat-teste-rls.md` documenta o
// roteiro manual (duas contas, tentar ler a conversa da outra) pra rodar
// localmente antes do merge.
function lerBriefing(bruto: unknown): Briefing | null {
  if (!bruto || typeof bruto !== 'object') return null
  const objeto = bruto as Record<string, unknown>
  if (typeof objeto.resumo !== 'string') return null
  return {
    resumo: objeto.resumo,
    dataDesejada: typeof objeto.dataDesejada === 'string' ? objeto.dataDesejada : undefined,
  }
}

export default function Conversa() {
  const { id } = useParams<{ id: string }>()
  const { sessao, carregando: carregandoSessao } = useSessao()
  const meuId = sessao?.user.id

  const [estado, setEstado] = useState<Estado>('carregando')
  const [participante, setParticipante] = useState<ParticipanteConversa | null>(null)
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [temMais, setTemMais] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  const fimDaListaRef = useRef<HTMLDivElement | null>(null)
  const primeiraCargaRef = useRef(true)

  useEffect(() => {
    if (!id || carregandoSessao || !meuId) return
    let ativo = true

    Promise.all([buscarConversa(id, meuId), listarMensagens(id)])
      .then(([dadosParticipante, dadosMensagens]) => {
        if (!ativo) return
        setParticipante(dadosParticipante)
        setMensagens(dadosMensagens)
        setTemMais(dadosMensagens.length >= PAGINA_MENSAGENS)
        setEstado('pronto')
        void marcarConversaComoLida(id, meuId)
      })
      .catch((erro) => {
        if (!ativo) return
        // RLS barra quem não é um dos dois lados: um `.single()` sem linha
        // vira erro do PostgREST, não "não encontrada" — tratado como o
        // mesmo estado porque, pra quem está vendo, a diferença não importa.
        setEstado(erro instanceof ErroDeAplicacao ? 'nao-encontrada' : 'erro')
      })

    return () => {
      ativo = false
    }
  }, [id, carregandoSessao, meuId])

  function aoReceberMensagem(mensagem: Message) {
    setMensagens((atuais) => (atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem]))
    if (meuId && mensagem.sender_id !== meuId && id) {
      void marcarConversaComoLida(id, meuId)
    }
  }

  useMensagensRealtime(estado === 'pronto' ? id : undefined, aoReceberMensagem)

  useEffect(() => {
    if (estado !== 'pronto') return
    fimDaListaRef.current?.scrollIntoView({ behavior: primeiraCargaRef.current ? 'auto' : 'smooth' })
    primeiraCargaRef.current = false
  }, [mensagens, estado])

  async function aoCarregarMais() {
    if (!id || mensagens.length === 0) return
    setCarregandoMais(true)
    try {
      const maisAntigas = await listarMensagens(id, mensagens[0].created_at)
      setMensagens((atuais) => [...maisAntigas, ...atuais])
      setTemMais(maisAntigas.length >= PAGINA_MENSAGENS)
    } catch {
      // Falha ao paginar não é crítica o bastante pra tomar a tela — a
      // pessoa ainda vê as mensagens que já tinha carregado.
      setTemMais(false)
    } finally {
      setCarregandoMais(false)
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (!id || !meuId) return
    const corpo = texto.trim()
    if (!corpo) return

    setErroEnvio(null)
    setEnviando(true)
    try {
      const mensagem = await enviarMensagem(id, meuId, corpo)
      setMensagens((atuais) => (atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem]))
      setTexto('')
    } catch (erro) {
      setErroEnvio(erro instanceof ErroDeAplicacao ? erro.message : 'Não foi possível enviar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregandoSessao || estado === 'carregando') return null

  if (!id || estado === 'nao-encontrada') {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <h2>Conversa não encontrada</h2>
          <p>Esta conversa não existe ou não é sua.</p>
          <Link to="/conversas">Voltar para minhas conversas</Link>
        </article>
      </section>
    )
  }

  if (estado === 'erro' || !participante) {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <p className="form-alerta">Não foi possível carregar esta conversa. Tente de novo.</p>
        </article>
      </section>
    )
  }

  const briefing = lerBriefing(participante.conversation.briefing)

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail chat-pagina" style={{ position: 'static', maxWidth: 720 }}>
        <div className="worker-top">
          <div className="avatar">
            {participante.outroAvatarUrl ? (
              <img className="avatar-img" src={participante.outroAvatarUrl} alt="" />
            ) : (
              <span className="avatar-fallback">{participante.outroNome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2>{participante.outroNome}</h2>
            <p>{participante.souCliente ? 'Profissional' : 'Cliente'}</p>
          </div>
        </div>

        {briefing && (
          <div className="chat-briefing">
            <strong>Pedido inicial</strong>
            <p>{briefing.resumo}</p>
            {briefing.dataDesejada && <p className="chat-briefing-data">Data desejada: {briefing.dataDesejada}</p>}
          </div>
        )}

        <div className="chat-mensagens">
          {temMais && (
            <button type="button" className="ghost-button chat-carregar-mais" onClick={aoCarregarMais} disabled={carregandoMais}>
              {carregandoMais ? 'Carregando…' : 'Carregar mensagens anteriores'}
            </button>
          )}

          {mensagens.length === 0 && (
            <p className="empty-state">Nenhuma mensagem ainda. Diga oi para começar a conversa.</p>
          )}

          {mensagens.map((mensagem) => (
            <div key={mensagem.id} className={`chat-balao ${mensagem.sender_id === meuId ? 'chat-balao-eu' : 'chat-balao-outro'}`}>
              <p>{mensagem.body}</p>
              <span className="chat-balao-hora">{formatarHorarioMensagem(mensagem.created_at)}</span>
            </div>
          ))}

          <div ref={fimDaListaRef} />
        </div>

        {erroEnvio && <p className="form-alerta">{erroEnvio}</p>}

        <form className="chat-form" onSubmit={aoEnviar}>
          <input
            type="text"
            aria-label="Mensagem"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Escreva uma mensagem…"
            autoComplete="off"
          />
          <button type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </article>
    </section>
  )
}
