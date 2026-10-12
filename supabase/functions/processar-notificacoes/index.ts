// T08.1 (e-mail, Resend) + T08.2 (push, Web Push) + T08.3 (disparo por
// evento, consumindo a fila) da Epic E08 — Notificações.
//
// Esta Edge Function é o único lugar do produto que de fato manda e-mail ou
// push. Os triggers da migration (20261012140000_notificacoes_infra.sql) só
// ENFILEIRAM linhas em notification_events, dentro da transação da ação de
// negócio (propor contratação, aprovar verificação etc.) — nunca fazem
// chamada de rede. Esta função roda FORA dessa transação, chamada
// periodicamente pelo pg_cron (ver docs/notificacoes-deploy.md para o
// `cron.schedule` com `net.http_post`, que só pode ser aplicado depois do
// deploy, com a URL e o service_role key reais).
//
// Variáveis de ambiente (secrets da função, nunca no código):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já disponíveis por padrão em
//     toda Edge Function do Supabase.
//   RESEND_API_KEY        — T08.1, provedor de e-mail transacional.
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT — T08.2, Web Push.
//
// Não há teste automatizado disto neste ambiente (sem Supabase local, sem
// as chaves reais de Resend/VAPID) — ver docs/notificacoes-deploy.md para o
// roteiro de verificação manual depois do deploy.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const LOTE = 50

type EventoNotificacao = {
  id: string
  profile_id: string
  tipo: string
  dados: Record<string, unknown>
  created_at: string
}

type Conteudo = { assunto: string; email: string; pushTitulo: string; pushCorpo: string; url: string }

// Templates em português (T08.1). `dados` vem do jsonb gravado por cada
// trigger — ver a migration pra saber o shape exato de cada tipo.
function montarConteudo(evento: EventoNotificacao): Conteudo {
  const d = evento.dados
  switch (evento.tipo) {
    case 'mensagem_nova':
      return {
        assunto: 'Você recebeu uma nova mensagem no Empregaê',
        email: 'Você tem uma mensagem nova esperando resposta.',
        pushTitulo: 'Nova mensagem',
        pushCorpo: 'Você tem uma mensagem nova no Empregaê.',
        url: `/conversas/${d.conversation_id}`,
      }
    case 'contratacao_proposta':
      return {
        assunto: 'Nova proposta de contratação no Empregaê',
        email: 'Alguém propôs uma contratação na sua conversa.',
        pushTitulo: 'Nova proposta',
        pushCorpo: 'Você recebeu uma proposta de contratação.',
        url: `/conversas/${d.conversation_id}`,
      }
    case 'contratacao_aceita':
      return {
        assunto: 'Sua proposta foi aceita',
        email: 'A contratação que você propôs foi aceita.',
        pushTitulo: 'Proposta aceita',
        pushCorpo: 'Sua proposta de contratação foi aceita.',
        url: `/conversas/${d.conversation_id}`,
      }
    case 'contratacao_concluida':
      return {
        assunto: 'Contratação concluída no Empregaê',
        email: 'Uma contratação foi marcada como concluída. Já dá pra avaliar.',
        pushTitulo: 'Contratação concluída',
        pushCorpo: 'Uma contratação sua foi concluída.',
        url: `/conversas/${d.conversation_id}`,
      }
    case 'verificacao_aprovada':
      return {
        assunto: 'Sua verificação foi aprovada',
        email: 'Seu documento foi analisado e aprovado — o selo já está no seu perfil.',
        pushTitulo: 'Verificação aprovada',
        pushCorpo: 'Seu selo de verificação está ativo.',
        url: '/verificacao',
      }
    case 'verificacao_reprovada':
      return {
        assunto: 'Sua verificação precisa ser reenviada',
        email: 'Seu documento não foi aprovado. Você pode reenviar na tela de verificação.',
        pushTitulo: 'Verificação reprovada',
        pushCorpo: 'Reenvie seu documento de verificação.',
        url: '/verificacao',
      }
    case 'verificacao_expirando':
      return {
        assunto: 'Seu selo de verificação está perto de vencer',
        email: 'Seu selo de verificação vence em breve. Solicite uma nova verificação para não perder o selo.',
        pushTitulo: 'Verificação vencendo',
        pushCorpo: 'Seu selo de verificação vence em breve.',
        url: '/verificacao',
      }
    case 'mensagem_sem_resposta':
      return {
        assunto: 'Você tem uma mensagem sem resposta',
        email: 'Uma conversa sua está há mais de 24h sem resposta.',
        pushTitulo: 'Mensagem sem resposta',
        pushCorpo: 'Você tem uma conversa esperando resposta há mais de 24h.',
        url: `/conversas/${d.conversation_id}`,
      }
    default:
      return {
        assunto: 'Novidade no Empregaê',
        email: 'Você tem uma novidade no Empregaê.',
        pushTitulo: 'Empregaê',
        pushCorpo: 'Você tem uma novidade.',
        url: '/',
      }
  }
}

async function enviarEmail(params: { apiKey: string; para: string; conteudo: Conteudo; tokenDesinscricao: string; appUrl: string }) {
  const { apiKey, para, conteudo, tokenDesinscricao, appUrl } = params
  const linkDesinscricao = `${appUrl}/notificacoes/desinscrever?token=${tokenDesinscricao}`

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // T08.1 — "remetente verificado": o domínio precisa estar verificado
      // no Resend antes do go-live; em desenvolvimento o Resend aceita
      // onboarding@resend.dev como remetente de teste.
      from: 'Empregaê <notificacoes@empregae.com.br>',
      to: [para],
      subject: conteudo.assunto,
      html:
        `<p>${conteudo.email}</p>` +
        `<p><a href="${appUrl}${conteudo.url}">Abrir no Empregaê</a></p>` +
        `<hr/><p style="font-size:12px;color:#6d766f">` +
        `Não quer mais receber estes e-mails? <a href="${linkDesinscricao}">Cancelar inscrição</a>.</p>`,
    }),
  })

  if (!resposta.ok) {
    console.error('[resend]', resposta.status, await resposta.text())
  }
}

async function enviarPush(params: {
  subscription: { endpoint: string; p256dh: string; auth_chave: string }
  conteudo: Conteudo
  vapid: { publicKey: string; privateKey: string; subject: string }
}) {
  const { subscription, conteudo, vapid } = params
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_chave },
      },
      JSON.stringify({ title: conteudo.pushTitulo, body: conteudo.pushCorpo, url: conteudo.url }),
    )
  } catch (erro) {
    // 410/404 = inscrição morta (navegador desinstalado, permissão
    // revogada etc.) — não é um erro de envio, é limpeza de dado velho.
    const status = (erro as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      console.warn('[webpush] inscrição expirada, removendo', subscription.endpoint)
    } else {
      console.error('[webpush]', erro)
    }
  }
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@empregae.com.br'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://empregae.com.br'

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: eventos, error: erroEventos } = await supabase
    .from('notification_events')
    .select('id, profile_id, tipo, dados, created_at')
    .is('processado_em', null)
    .order('created_at', { ascending: true })
    .limit(LOTE)

  if (erroEventos) {
    console.error('[notification_events]', erroEventos)
    return new Response(JSON.stringify({ erro: erroEventos.message }), { status: 500 })
  }
  if (!eventos || eventos.length === 0) {
    return new Response(JSON.stringify({ processados: 0 }), { status: 200 })
  }

  const idsProfile = [...new Set(eventos.map((e) => e.profile_id))]

  const [{ data: perfis }, { data: preferencias }, { data: inscricoes }] = await Promise.all([
    supabase.from('profiles').select('id, nome').in('id', idsProfile),
    supabase.from('notification_preferences').select('profile_id, email_ativo, push_ativo, desinscricao_token').in('profile_id', idsProfile),
    supabase.from('push_subscriptions').select('profile_id, endpoint, p256dh, auth_chave').in('profile_id', idsProfile),
  ])

  // E-mail do usuário vem de auth.admin, não de `profiles` (que não guarda
  // e-mail — ver T01.1). service_role permite o Admin API.
  const emailPorProfile = new Map<string, string>()
  for (const id of idsProfile) {
    const { data } = await supabase.auth.admin.getUserById(id)
    if (data.user?.email) emailPorProfile.set(id, data.user.email)
  }

  const preferenciaPorProfile = new Map((preferencias ?? []).map((p) => [p.profile_id, p]))
  const inscricoesPorProfile = new Map<string, Array<{ endpoint: string; p256dh: string; auth_chave: string }>>()
  for (const inscricao of inscricoes ?? []) {
    const lista = inscricoesPorProfile.get(inscricao.profile_id) ?? []
    lista.push(inscricao)
    inscricoesPorProfile.set(inscricao.profile_id, lista)
  }
  void perfis // nome fica disponível pra um template mais personalizado depois; não usado ainda.

  let processados = 0

  for (const evento of eventos) {
    const conteudo = montarConteudo(evento as EventoNotificacao)
    // Preferência padrão é tudo ligado (mesma regra de lib/notificacoes.ts)
    // quando a pessoa nunca configurou nada.
    const preferencia = preferenciaPorProfile.get(evento.profile_id) ?? {
      email_ativo: true,
      push_ativo: true,
      desinscricao_token: null,
    }

    const tarefas: Promise<unknown>[] = []

    if (preferencia.email_ativo && resendApiKey) {
      const email = emailPorProfile.get(evento.profile_id)
      if (email) {
        tarefas.push(
          enviarEmail({
            apiKey: resendApiKey,
            para: email,
            conteudo,
            tokenDesinscricao: preferencia.desinscricao_token ?? '',
            appUrl,
          }),
        )
      }
    }

    if (preferencia.push_ativo && vapidPublicKey && vapidPrivateKey) {
      for (const subscription of inscricoesPorProfile.get(evento.profile_id) ?? []) {
        tarefas.push(enviarPush({ subscription, conteudo, vapid: { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject } }))
      }
    }

    await Promise.allSettled(tarefas)

    await supabase.from('notification_events').update({ processado_em: new Date().toISOString() }).eq('id', evento.id)
    processados++
  }

  return new Response(JSON.stringify({ processados }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
