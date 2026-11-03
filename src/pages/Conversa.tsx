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
import {
  buscarContratacaoEmAberto,
  proporContratacao,
  aceitarContratacao,
  recusarOuCancelarContratacao,
  confirmarConclusao,
  formatarValorContratacao,
  formatarDataServico,
  RUBRICA_STATUS_BOOKING,
  type Booking,
} from '../lib/contratacao'
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
//
// E05 (T05.1-T05.4) mora aqui dentro de propósito: "ação dentro da
// conversa" (spec) — propor, aceitar/recusar, confirmar conclusão e
// cancelar aparecem como um cartão fixo logo abaixo do briefing. Histórico e
// métrica (T05.5/T05.6) ficam em /contratacoes — aqui só o que está em
// aberto agora.
function lerBriefing(bruto: unknown): Briefing | null {
  if (!bruto || typeof bruto !== 'object') return null
  const objeto = bruto as Record<string, unknown>
  if (typeof objeto.resumo !== 'string') return null
  return {
    resumo: objeto.resumo,
    dataDesejada: typeof objeto.dataDesejada === 'string' ? objeto.dataDesejada : undefined,
  }
}

type CartaoContratacaoProps = {
  meuId: string
  souCliente: boolean
  conversationId: string
}

function CartaoContratacao({ meuId, souCliente, conversationId }: CartaoContratacaoProps) {
  const [estado, setEstado] = useState<'carregando' | 'pronto'>('carregando')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')

  useEffect(() => {
    let ativo = true
    buscarContratacaoEmAberto(conversationId)
      .then((resultado) => {
        if (!ativo) return
        setBooking(resultado)
        setEstado('pronto')
      })
      .catch(() => {
        if (!ativo) return
        setEstado('pronto')
      })
    return () => {
      ativo = false
    }
  }, [conversationId])

  async function aoPropor(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)

    const valorNumerico = Number(valor.replace(/\D/g, ''))
    if (!valorNumerico) {
      setErro('Informe o valor combinado.')
      return
    }

    setProcessando(true)
    try {
      const nova = await proporContratacao({
        conversationId,
        meuId,
        valorCombinadoCentavos: valorNumerico,
        dataServico: data,
      })
      setBooking(nova)
      setMostrarForm(false)
      setValor('')
      setData('')
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível propor a contratação.')
    } finally {
      setProcessando(false)
    }
  }

  async function aoAceitar() {
    if (!booking) return
    setErro(null)
    setProcessando(true)
    try {
      setBooking(await aceitarContratacao(booking.id))
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível aceitar.')
    } finally {
      setProcessando(false)
    }
  }

  async function aoRecusarOuCancelar() {
    if (!booking) return
    const motivo = window.prompt('Motivo (opcional):') ?? undefined
    setErro(null)
    setProcessando(true)
    try {
      setBooking(
        await recusarOuCancelarContratacao({ bookingId: booking.id, meuId, statusAtual: booking.status, motivo }),
      )
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível cancelar.')
    } finally {
      setProcessando(false)
    }
  }

  async function aoConfirmarConclusao() {
    if (!booking) return
    setErro(null)
    setProcessando(true)
    try {
      setBooking(await confirmarConclusao({ bookingId: booking.id, meuId, souCliente }))
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível confirmar.')
    } finally {
      setProcessando(false)
    }
  }

  if (estado === 'carregando') return null

  if (!booking) {
    return (
      <div className="contratacao-card">
        {!mostrarForm ? (
          <button type="button" className="ghost-button" onClick={() => setMostrarForm(true)}>
            Propor contratação
          </button>
        ) : (
          <form className="briefing-form" onSubmit={aoPropor}>
            {erro && <p className="form-alerta">{erro}</p>}
            <label>
              Valor combinado (R$)
              <input
                type="text"
                inputMode="numeric"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                placeholder="Ex.: 15000 = R$ 150,00"
              />
            </label>
            <label>
              Data do serviço
              <input type="date" value={data} onChange={(evento) => setData(evento.target.value)} required />
            </label>
            <div className="contratacao-acoes">
              <button type="submit" disabled={processando}>
                {processando ? 'Enviando…' : 'Enviar proposta'}
              </button>
              <button type="button" className="ghost-button" onClick={() => setMostrarForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  const souProponente = booking.proposto_por === meuId

  return (
    <div className="contratacao-card">
      <div className="contratacao-card-topo">
        <span className={`contratacao-status contratacao-status-${booking.status}`}>
          {RUBRICA_STATUS_BOOKING[booking.status]}
        </span>
        <strong>{formatarValorContratacao(booking.valor_combinado_centavos)}</strong>
        <span>{formatarDataServico(booking.data_servico)}</span>
      </div>

      {erro && <p className="form-alerta">{erro}</p>}

      {booking.status === 'proposto' && (
        <div className="contratacao-acoes">
          {!souProponente && (
            <button type="button" onClick={aoAceitar} disabled={processando}>
              Aceitar
            </button>
          )}
          <button type="button" className="danger-button" onClick={aoRecusarOuCancelar} disabled={processando}>
            {souProponente ? 'Cancelar proposta' : 'Recusar'}
          </button>
        </div>
      )}

      {booking.status === 'aceito' && (
        <div className="contratacao-acoes">
          <button type="button" onClick={aoConfirmarConclusao} disabled={processando}>
            {(souCliente ? booking.confirmado_cliente_em : booking.confirmado_profissional_em)
              ? 'Aguardando o outro lado…'
              : 'Confirmar conclusão'}
          </button>
          <button type="button" className="danger-button" onClick={aoRecusarOuCancelar} disabled={processando}>
            Cancelar
          </button>
        </div>
      )}

      <p className="contratacao-card-link">
        <Link to="/contratacoes">Ver histórico de contratações</Link>
      </p>
    </div>
  )
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

        {meuId && (
          <CartaoContratacao meuId={meuId} souCliente={participante.souCliente} conversationId={participante.conversation.id} />
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
