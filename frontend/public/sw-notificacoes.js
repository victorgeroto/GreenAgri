// Carregado pelo service worker do Workbox (importScripts): ao tocar numa notificação
// do sistema, foca uma aba do GreenAgri (ou abre uma) na tela do aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      const aba = abas.find((c) => c.url.startsWith(self.location.origin))
      if (aba) return aba.focus().then(() => aba.navigate(url))
      return self.clients.openWindow(url)
    }),
  )
})
