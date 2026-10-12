import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarAnuncioPublico, formatarPreco, type AnuncioPublico } from '../lib/anuncio'
import { useSessao } from '../lib/auth'
import { abrirOuEncontrarConversa } from '../lib/chat'
import { ErroDeAplicacao } from '../lib/erros'

type Estado = 'carregando' | 'encontrado' | 'nao-encontrado' | 'erro'

// T02.6 — Página pública do anúncio.
//
// Sem telefone, sem coordenada exata: `buscarAnuncioPublico` só busca
// colunas que estão no GRANT de select da RLS (T00.4), então essas duas
// simplesmente não têm como aparecer aqui, nem por engano.
//
// "Distância" (prevista no T02.6 original) fica de fora por enquanto: ela
// só faz sentido a partir de uma busca que sabe de onde o cliente está
// olhando, e isso é a T03.1 (E03 — Busca geográfica), que roda numa outra
// branch/PR (a busca decide de onde o cliente está olhando; esta página
// não recalcula nada, só receberia a distância pronta via query string ou
// state da navegação quando ligar as duas pontas).
//
// O botão "Iniciar conversa" (T04.1, E04 — Chat) agora abre um formulário
// de briefing (resumo + data desejada) e cria/reabre a conversa via
// `abrirOuEncontrarConversa` (chat.ts) — ver BriefingModal abaixo.
function PaginaNaoEncontrada() {
  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
        <h2>Anúncio não encontrado</h2>
        <p>Este profissional não existe ou não está com o anúncio publicado no momento.</p>
      </article>
    </section>
  )
}

type BriefingModalProps = {
  nomeProfissional: string
  onFechar: () => void
  onEnviar: (resumo: string, dataDesejada: string) => Promise<void>
}

/**
 * Formulário estruturado e simplificado do protótipo (T04.1): só "o que
 * você precisa" e "quando", os dois campos que o profissional realmente
 * usa pra decidir se topa antes mesmo de abrir o chat. Usa `<dialog>` nativo
 * (`.profile-modal`, já existia no CSS do design system, nunca tinha sido
 * usado) em vez de um componente de modal próprio.
 */
function BriefingModal({ nomeProfissional, onFechar, onEnviar }: BriefingModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [resumo, setResumo] = useState('')
  const [dataDesejada, setDataDesejada] = useState('')
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
    const texto = resumo.trim()
    if (texto.length < 10) {
      setErro('Descreva em pelo menos 10 caracteres o que você precisa.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await onEnviar(texto, dataDesejada.trim())
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ErroDeAplicacao ? erroCapturado.message : 'Não foi possível iniciar a conversa. Tente de novo.')
      setEnviando(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="profile-modal" onClose={onFechar}>
      <div className="profile-detail">
        <button type="button" className="close-button" onClick={fechar} aria-label="Fechar">
          ×
        </button>
        <h2>Falar com {nomeProfissional}</h2>
        <p>Conte rapidamente o que você precisa — isso já chega com a primeira mensagem.</p>

        <form className="briefing-form" onSubmit={aoEnviar}>
          {erro && <p className="form-alerta">{erro}</p>}

          <label>
            O que você precisa?
            <textarea
              value={resumo}
              onChange={(evento) => setResumo(evento.target.value)}
              rows={4}
              placeholder="Ex.: preciso trocar o registro do chuveiro, urgente."
            />
          </label>

          <label>
            Data desejada (opcional)
            <input
              type="text"
              value={dataDesejada}
              onChange={(evento) => setDataDesejada(evento.target.value)}
              placeholder="Ex.: essa semana, sábado de manhã…"
            />
          </label>

          <button type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Iniciar conversa'}
          </button>
        </form>
      </div>
    </dialog>
  )
}

export default function PerfilProfissional() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { sessao, carregando: carregandoSessao } = useSessao()

  const [estado, setEstado] = useState<Estado>('carregando')
  const [dados, setDados] = useState<AnuncioPublico | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    if (!id) return
    let ativo = true
    buscarAnuncioPublico(id)
      .then((resultado) => {
        if (!ativo) return
        setDados(resultado)
        setEstado(resultado ? 'encontrado' : 'nao-encontrado')
      })
      .catch(() => {
        if (ativo) setEstado('erro')
      })
    return () => {
      ativo = false
    }
  }, [id])

  // Sem :id na rota não há o que buscar — não é um estado de carregamento,
  // é o mesmo "não encontrado" de um id que não existe. Decidido no render,
  // não dentro do efeito.
  if (!id) return <PaginaNaoEncontrada />
  if (estado === 'carregando') return null

  if (estado === 'erro') {
    return (
      <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
          <p className="form-alerta">Não foi possível carregar este perfil. Tente de novo.</p>
        </article>
      </section>
    )
  }

  if (estado === 'nao-encontrado' || !dados) {
    return <PaginaNaoEncontrada />
  }

  const { perfil, anuncio, categorias } = dados
  const selo = anuncio.verificado_ate && new Date(anuncio.verificado_ate) >= new Date()
  const souEsteProfissional = sessao?.user.id === perfil.id

  function aoClicarIniciarConversa() {
    if (carregandoSessao) return
    if (!sessao) {
      navegar('/entrar', { state: { de: `/profissional/${id}` } })
      return
    }
    setModalAberto(true)
  }

  async function aoEnviarBriefing(resumo: string, dataDesejada: string) {
    if (!sessao) return
    const conversa = await abrirOuEncontrarConversa(sessao.user.id, anuncio.id, {
      resumo,
      ...(dataDesejada ? { dataDesejada } : {}),
    })
    navegar(`/conversas/${conversa.id}`)
  }

  return (
    <section className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
      <article className="sidebar profile-detail" style={{ position: 'static', maxWidth: 620 }}>
        <div className="profile-head worker-top">
          <div className="avatar avatar-large">
            {perfil.avatarUrl ? (
              <img className="avatar-img" src={perfil.avatarUrl} alt="" />
            ) : (
              <span className="avatar-fallback">{perfil.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2>{perfil.nome}</h2>
            <p>
              {anuncio.bairro}, {anuncio.cidade}/{anuncio.uf}
            </p>
          </div>
        </div>

        <div className="tag-row">
          {selo && <span className="tag tag-featured">Verificado</span>}
          {anuncio.preco_medio_centavos !== null && anuncio.unidade_preco && (
            <span className="tag">{formatarPreco(anuncio.preco_medio_centavos, anuncio.unidade_preco)}</span>
          )}
          <span className="tag">Atende num raio de {anuncio.raio_atendimento_km} km</span>
        </div>

        {categorias.length > 0 && (
          <div className="tag-row" style={{ marginTop: 10 }}>
            {categorias.map((categoria) => (
              <span key={categoria.id} className="tag tag-match">
                {categoria.nome}
              </span>
            ))}
          </div>
        )}

        {anuncio.descricao && <p style={{ marginTop: 16 }}>{anuncio.descricao}</p>}

        <div className="profile-actions">
          {souEsteProfissional ? (
            <button type="button" className="hire-button" disabled title="Este é o seu próprio anúncio.">
              Iniciar conversa
            </button>
          ) : (
            <button type="button" className="hire-button" onClick={aoClicarIniciarConversa}>
              Iniciar conversa
            </button>
          )}
        </div>
      </article>

      {modalAberto && (
        <BriefingModal nomeProfissional={perfil.nome} onFechar={() => setModalAberto(false)} onEnviar={aoEnviarBriefing} />
      )}
    </section>
  )
}
