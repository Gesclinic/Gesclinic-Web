// public/service-worker.js
// Service Worker para gerenciar push notifications

const CACHE_NAME = 'gesclinic-alerts-v1'
const ALERTS_API = '/api/alerts'

// Event: Installation
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...')
  event.waitUntil(self.skipWaiting())
})

// Event: Activation
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...')
  event.waitUntil(self.clients.claim())
})

// Event: Push Notification Received
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push received:', event)

  if (!event.data) {
    console.log('[ServiceWorker] Push notification has no data')
    return
  }

  try {
    const data = event.data.json()
    const options = buildNotificationOptions(data)
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Gesclinic', options)
    )
  } catch (error) {
    console.error('[ServiceWorker] Error parsing push data:', error)
    
    // Fallback: mostrar texto simples
    event.waitUntil(
      self.registration.showNotification('Gesclinic', {
        body: event.data.text(),
        icon: '/logo.png',
        badge: '/logo-badge.png',
      })
    )
  }
})

// Event: Notification Click
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/clinica/financeiro/alerts'
  const alertId = event.notification.data?.alertId

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Verificar se já existe janela aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Caso contrário, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )

  // Marcar notification como clicada na API
  if (alertId) {
    markNotificationAsClicked(alertId)
  }
})

// Event: Notification Close
self.addEventListener('notificationclose', event => {
  console.log('[ServiceWorker] Notification dismissed:', event.notification.tag)
})

// Event: Message from Client
self.addEventListener('message', event => {
  console.log('[ServiceWorker] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'TRIGGER_ALERT_CHECK') {
    triggerAlertCheck()
  }
})

/**
 * Constrói opções de notificação baseado em dados do alerta
 */
function buildNotificationOptions(alertData) {
  const severityColors = {
    CRITICAL: '#dc2626',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
  }

  const severityIcons = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
  }

  const severity = alertData.severity || 'MEDIUM'
  const color = severityColors[severity] || '#6b7280'
  const icon = severityIcons[severity] || '🔔'

  return {
    body: `${icon} ${alertData.message || 'Novo alerta'}`,
    icon: '/logo.png',
    badge: '/logo-badge.png',
    tag: `alert-${alertData.alertId || Date.now()}`,
    requireInteraction: severity === 'CRITICAL' || severity === 'HIGH',
    actions: [
      {
        action: 'resolve',
        title: '✓ Resolver',
      },
      {
        action: 'dismiss',
        title: '✕ Descartar',
      },
    ],
    data: {
      alertId: alertData.alertId,
      url: '/clinica/financeiro/alerts',
      severity: severity,
      timestamp: new Date().toISOString(),
    },
    // Badge visual
    badge: color,
  }
}

/**
 * Marca notification como clicada na API
 */
async function markNotificationAsClicked(alertId) {
  try {
    await fetch(`${ALERTS_API}/notifications/${alertId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[ServiceWorker] Error marking notification as clicked:', error)
  }
}

/**
 * Dispara verificação de alertas periodicamente
 */
async function triggerAlertCheck() {
  try {
    const response = await fetch('/api/alerts/check')
    const data = await response.json()
    console.log('[ServiceWorker] Alert check result:', data)
  } catch (error) {
    console.error('[ServiceWorker] Error checking alerts:', error)
  }
}

/**
 * Background Sync (dispara quando volta online)
 */
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync:', event.tag)
  
  if (event.tag === 'sync-alerts') {
    event.waitUntil(triggerAlertCheck())
  }
})

// Periodic Background Sync (cada 15 minutos)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-alerts-periodic') {
    event.waitUntil(triggerAlertCheck())
  }
})
