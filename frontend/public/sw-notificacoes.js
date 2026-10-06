// Carregado pelo service worker do Workbox (importScripts): ao tocar numa notificação
// do sistema, foca uma aba do GreenAgri (ou abre uma) na tela do aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Só caminhos internos do próprio app (evita redirecionamento para fora).
  const destino = new URL(event.notification.data?.url || '/', self.location.origin)
  const url = destino.origin === self.location.origin ? destino.href : self.location.origin + '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      const aba = abas.find((c) => c.url.startsWith(self.location.origin))
      if (aba) return aba.focus().then(() => aba.navigate(url))
      return self.clients.openWindow(url)
    }),
  )
})
