// T08.2 — Web Push: extensão do service worker gerado pelo Workbox
// (vite-plugin-pwa, modo generateSW). Workbox não lida com push por conta
// própria; este arquivo é injetado no SW final via `workbox.importScripts`
// (vite.config.ts) — roda no mesmo escopo, sem precisar trocar de estratégia
// de build nem adicionar dependência nova.
//
// Payload esperado (enviado pela Edge Function processar-notificacoes):
//   { title: string, body: string, url?: string, icon?: string }

self.addEventListener('push', (evento) => {
  let dados = { title: 'Empregaê', body: 'Você tem uma novidade.' }
  try {
    if (evento.data) dados = { ...dados, ...evento.data.json() }
  } catch {
    // payload sem JSON válido: mantém o texto padrão em vez de quebrar.
  }

  evento.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: dados.icon || '/assets/logo-empregae.svg',
      badge: '/assets/logo-empregae.svg',
      data: { url: dados.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = evento.notification.data?.url || '/'

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaDeClientes) => {
      for (const cliente of listaDeClientes) {
        if (cliente.url.includes(destino) && 'focus' in cliente) return cliente.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino)
    }),
  )
})
