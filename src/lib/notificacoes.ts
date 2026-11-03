import { supabase } from './supabase'
import { desembrulhar, ErroDeAplicacao, traduzirErro } from './erros'

// E08 — Notificações (T08.1 a T08.5).
//
// Esta camada cobre só o que roda no navegador: preferências por canal
// (T08.4) e a inscrição de Web Push (T08.2). O que de fato ENVIA e-mail
// (T08.1, Resend) e push (T08.2, Web Push) é a Edge Function
// `processar-notificacoes` (supabase/functions/processar-notificacoes/),
// que lê a fila gravada pelos triggers da migration desta epic (T08.3) —
// nada daquilo passa por aqui.

export type PreferenciasNotificacao = {
  emailAtivo: boolean
  pushAtivo: boolean
}

const PADRAO: PreferenciasNotificacao = { emailAtivo: true, pushAtivo: true }

// ---------------------------------------------------------------------------
// T08.4 — Preferências
// ---------------------------------------------------------------------------

/** Busca as preferências; se a pessoa nunca configurou nada, devolve o
 *  padrão (tudo ligado) SEM criar linha — a linha só nasce quando ela
 *  realmente muda alguma coisa (salvarPreferencias faz upsert). */
export async function buscarPreferencias(profileId: string): Promise<PreferenciasNotificacao> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('email_ativo, push_ativo')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('[supabase]', error)
    throw new ErroDeAplicacao(traduzirErro(error))
  }
  if (!data) return PADRAO
  return { emailAtivo: data.email_ativo, pushAtivo: data.push_ativo }
}

export async function salvarPreferencias(profileId: string, preferencias: PreferenciasNotificacao): Promise<void> {
  desembrulhar(
    await supabase
      .from('notification_preferences')
      .upsert(
        { profile_id: profileId, email_ativo: preferencias.emailAtivo, push_ativo: preferencias.pushAtivo },
        { onConflict: 'profile_id' },
      )
      .select('profile_id'),
  )
}

// ---------------------------------------------------------------------------
// T08.2 — Web Push
// ---------------------------------------------------------------------------

export function suportaPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/** VAPID manda a chave pública em base64url; PushManager.subscribe quer
 *  Uint8Array. Conversão padrão, sem dependência nova. */
function base64UrlParaUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = window.atob(base64)
  return Uint8Array.from([...bruto].map((caractere) => caractere.charCodeAt(0)))
}

/**
 * Pede permissão e inscreve o navegador atual em Web Push. Chamada só por
 * um clique explícito da pessoa (botão "Ativar notificações") — nunca no
 * carregamento da página, que é exatamente o padrão que faz gente recusar
 * permissão de notificação por reflexo (T08.2: "no momento certo").
 */
export async function inscreverPush(profileId: string): Promise<void> {
  if (!suportaPush()) {
    throw new ErroDeAplicacao('Este navegador não suporta notificações push.')
  }

  const chavePublica = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!chavePublica) {
    throw new ErroDeAplicacao('Notificações push ainda não estão configuradas neste ambiente.')
  }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new ErroDeAplicacao('Permissão de notificação não concedida.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlParaUint8Array(chavePublica) as BufferSource,
  })

  const chaves = subscription.toJSON().keys
  if (!chaves?.p256dh || !chaves.auth) {
    throw new ErroDeAplicacao('Não foi possível concluir a inscrição de notificações.')
  }

  desembrulhar(
    await supabase
      .from('push_subscriptions')
      .upsert(
        { profile_id: profileId, endpoint: subscription.endpoint, p256dh: chaves.p256dh, auth_chave: chaves.auth },
        { onConflict: 'endpoint' },
      )
      .select('id'),
  )
}

/** Cancela no navegador E remove a linha — sem isso, a Edge Function
 *  continuaria tentando mandar push pra uma inscrição morta. */
export async function cancelarInscricaoPush(): Promise<void> {
  if (!suportaPush()) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) console.warn('[notificacoes] falha ao remover inscrição', error)
}

// ---------------------------------------------------------------------------
// T08.4 — Descadastro de e-mail pelo link do rodapé (sem login)
// ---------------------------------------------------------------------------

export async function desinscreverEmail(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('desinscrever_email', { p_token: token })
  if (error) {
    console.error('[supabase]', error)
    return false
  }
  return Boolean(data)
}
