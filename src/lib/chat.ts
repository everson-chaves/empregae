import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, type Linha } from './supabase'
import { desembrulhar, traduzirErro, ErroDeAplicacao } from './erros'

// E04 — Chat em tempo real (T04.1 a T04.6).
//
// T04.6 (remover o WhatsApp do produto) não tem código pra escrever aqui:
// este app é uma reescrita do zero, o botão do protótipo (app.js:477 no
// legado) nunca existiu nesta base. O que sobrava era o CSS morto
// (.whatsapp-link, nunca referenciado em nenhum .tsx) -- removido junto
// com esta epic. Conversa.tsx já documentava isso desde a T00.3.

export type Conversation = Linha<'conversations'>
export type Message = Linha<'messages'>

export type Briefing = {
  resumo: string
  dataDesejada?: string
}

// ---------------------------------------------------------------------------
// T04.1 — Abrir conversa com briefing
// ---------------------------------------------------------------------------

/**
 * Abre uma conversa nova, ou devolve a existente se já houver uma entre
 * este cliente e este profissional — `conversa_unica_por_par` é UNIQUE no
 * banco (T00.2), então a segunda tentativa de abrir vira um SELECT em vez
 * de um erro. Do ponto de vista de quem clicou "iniciar conversa", a
 * intenção sempre foi "falar com esse profissional", não "criar uma linha
 * nova" — restaurar a conversa de antes é o comportamento certo.
 */
export async function abrirOuEncontrarConversa(
  clientId: string,
  workerProfileId: string,
  briefing: Briefing,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ client_id: clientId, worker_profile_id: workerProfileId, briefing })
    .select('*')
    .single()

  if (!error) return data

  if (error.code === '23505') {
    return desembrulhar<Conversation>(
      await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', clientId)
        .eq('worker_profile_id', workerProfileId)
        .single(),
    )
  }

  console.error('[supabase]', error)
  throw new ErroDeAplicacao(traduzirErro(error))
}

// ---------------------------------------------------------------------------
// T04.2 — Mensagens
// ---------------------------------------------------------------------------

export const PAGINA_MENSAGENS = 30

/** Página mais recente por padrão; passe `antesDe` (created_at de referência)
 *  pra carregar mensagens mais antigas que aquele ponto. */
export async function listarMensagens(conversationId: string, antesDe?: string): Promise<Message[]> {
  let consulta = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(PAGINA_MENSAGENS)

  if (antesDe) consulta = consulta.lt('created_at', antesDe)

  const linhas = desembrulhar<Message[]>(await consulta)
  return linhas.reverse() // banco devolve mais nova primeiro; UI quer mais antiga primeiro
}

export async function enviarMensagem(conversationId: string, senderId: string, body: string): Promise<Message> {
  const texto = body.trim()
  if (!texto) throw new ErroDeAplicacao('Escreva algo antes de enviar.')

  return desembrulhar<Message>(
    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body: texto })
      .select('*')
      .single(),
  )
}

/** Marca como lidas as mensagens que EU recebi (nunca as que eu enviei —
 *  a RLS já barra isso, mas o filtro aqui evita a chamada inútil). */
export async function marcarConversaComoLida(conversationId: string, meuId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('read_at', null)
    .neq('sender_id', meuId)
  // Sem exigirLinha aqui: zero linhas é o caso normal de "já estava tudo
  // lido", não uma falha de permissão como seria em outras tabelas.
  if (error) console.warn('[chat] falha ao marcar como lida', error)
}

// ---------------------------------------------------------------------------
// T04.3 — Realtime
// ---------------------------------------------------------------------------

/**
 * Assina novas mensagens da conversa via Postgres Changes (Realtime). A
 * reconexão é responsabilidade do próprio cliente supabase-js (ele reabre o
 * socket sozinho); o que este hook garante é RESUBSCREVER quando o
 * `conversationId` muda e LIMPAR o canal antigo — um canal por conversa
 * aberta, nunca um acumulando em cima do outro.
 */
export function useMensagensRealtime(conversationId: string | undefined, aoReceber: (mensagem: Message) => void) {
  const aoReceberRef = useRef(aoReceber)

  useEffect(() => {
    aoReceberRef.current = aoReceber
  })

  useEffect(() => {
    if (!conversationId) return

    const canal: RealtimeChannel = supabase
      .channel(`mensagens:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => aoReceberRef.current(payload.new as Message),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [conversationId])
}

// ---------------------------------------------------------------------------
// T04.4 — Lista de conversas
// ---------------------------------------------------------------------------

export type ConversaResumo = {
  id: string
  outroNome: string
  outroAvatarUrl: string | null
  ultimaMensagem: string | null
  ultimaAtividadeEm: string
  naoLidas: number
}

/**
 * Lista as conversas de quem chama, ordenadas por atividade (última
 * mensagem, ou criação da conversa se ainda não tem mensagem nenhuma).
 *
 * A RLS de `conversations` (participa_da_conversa) já garante que só voltam
 * conversas onde eu sou um dos dois lados — não precisa filtrar isso aqui,
 * só decidir, PRA CADA UMA, se eu sou o cliente ou o profissional, pra saber
 * de quem é "o outro lado".
 */
export async function listarMinhasConversas(meuId: string): Promise<ConversaResumo[]> {
  const conversas = desembrulhar<Array<Pick<Conversation, 'id' | 'client_id' | 'worker_profile_id' | 'created_at'>>>(
    await supabase.from('conversations').select('id, client_id, worker_profile_id, created_at'),
  )
  if (conversas.length === 0) return []

  const idsConversas = conversas.map((c) => c.id)
  const idsWorkerProfile = [...new Set(conversas.filter((c) => c.client_id === meuId).map((c) => c.worker_profile_id))]

  // "Outro lado" de cada conversa: se eu sou o cliente, é o dono do
  // worker_profile; se eu sou o profissional, é o client_id direto.
  const workerProfiles =
    idsWorkerProfile.length > 0
      ? desembrulhar<Array<{ id: string; profile_id: string }>>(
          await supabase.from('worker_profiles').select('id, profile_id').in('id', idsWorkerProfile),
        )
      : []
  const profileIdPorWorkerProfile = new Map(workerProfiles.map((w) => [w.id, w.profile_id]))

  const idsOutroPerfil = conversas.map((c) =>
    c.client_id === meuId ? (profileIdPorWorkerProfile.get(c.worker_profile_id) ?? null) : c.client_id,
  )
  const idsPerfilUnicos = [...new Set(idsOutroPerfil.filter((id): id is string => id !== null))]

  const perfis =
    idsPerfilUnicos.length > 0
      ? desembrulhar<Array<{ id: string; nome: string; avatar_url: string | null }>>(
          await supabase.from('profiles').select('id, nome, avatar_url').in('id', idsPerfilUnicos),
        )
      : []
  const perfilPorId = new Map(perfis.map((p) => [p.id, p]))

  const todasMensagens =
    idsConversas.length > 0
      ? desembrulhar<Array<Pick<Message, 'conversation_id' | 'body' | 'created_at' | 'sender_id' | 'read_at'>>>(
          await supabase
            .from('messages')
            .select('conversation_id, body, created_at, sender_id, read_at')
            .in('conversation_id', idsConversas)
            .order('created_at', { ascending: false }),
        )
      : []

  const ultimaMensagemPorConversa = new Map<string, (typeof todasMensagens)[number]>()
  const naoLidasPorConversa = new Map<string, number>()
  for (const mensagem of todasMensagens) {
    if (!ultimaMensagemPorConversa.has(mensagem.conversation_id)) {
      ultimaMensagemPorConversa.set(mensagem.conversation_id, mensagem)
    }
    if (mensagem.read_at === null && mensagem.sender_id !== meuId) {
      naoLidasPorConversa.set(mensagem.conversation_id, (naoLidasPorConversa.get(mensagem.conversation_id) ?? 0) + 1)
    }
  }

  return conversas
    .map((conversa, indice) => {
      const outroId = idsOutroPerfil[indice]
      const outro = outroId ? perfilPorId.get(outroId) : undefined
      const ultima = ultimaMensagemPorConversa.get(conversa.id)
      return {
        id: conversa.id,
        outroNome: outro?.nome ?? 'Pessoa removida',
        outroAvatarUrl: outro?.avatar_url ?? null,
        ultimaMensagem: ultima?.body ?? null,
        ultimaAtividadeEm: ultima?.created_at ?? conversa.created_at,
        naoLidas: naoLidasPorConversa.get(conversa.id) ?? 0,
      }
    })
    .sort((a, b) => (a.ultimaAtividadeEm < b.ultimaAtividadeEm ? 1 : -1))
}

// ---------------------------------------------------------------------------
// Descobrir se EU sou o cliente ou o profissional numa conversa aberta,
// e quem é "o outro lado" — usado por Conversa.tsx pra montar o cabeçalho.
// ---------------------------------------------------------------------------

export type ParticipanteConversa = {
  conversation: Conversation
  souCliente: boolean
  outroNome: string
  outroAvatarUrl: string | null
}

export async function buscarConversa(conversationId: string, meuId: string): Promise<ParticipanteConversa> {
  const conversation = desembrulhar<Conversation>(
    await supabase.from('conversations').select('*').eq('id', conversationId).single(),
  )
  const souCliente = conversation.client_id === meuId

  let outroId: string
  if (souCliente) {
    const worker = desembrulhar<{ profile_id: string }>(
      await supabase.from('worker_profiles').select('profile_id').eq('id', conversation.worker_profile_id).single(),
    )
    outroId = worker.profile_id
  } else {
    outroId = conversation.client_id
  }

  const outro = desembrulhar<{ nome: string; avatar_url: string | null }>(
    await supabase.from('profiles').select('nome, avatar_url').eq('id', outroId).single(),
  )

  return { conversation, souCliente, outroNome: outro.nome, outroAvatarUrl: outro.avatar_url }
}

// ---------------------------------------------------------------------------
// Formatação — mesma ideia de `formatarPreco` (anuncio.ts) e
// `formatarDistancia` (busca.ts): a tela nunca formata data na mão.
// ---------------------------------------------------------------------------

/** Horário curto pra cada balão de mensagem (ex.: "14:32"). */
export function formatarHorarioMensagem(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Atividade relativa pra lista de conversas (ex.: "há 5 min", "ontem",
 *  ou a data curta quando já faz mais de uma semana). */
export function formatarAtividadeRelativa(iso: string): string {
  const data = new Date(iso)
  const diffMs = Date.now() - data.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `há ${diffHoras}h`

  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias === 1) return 'ontem'
  if (diffDias < 7) return `há ${diffDias} dias`

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
