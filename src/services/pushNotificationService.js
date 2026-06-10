// src/services/pushNotificationService.js
// Serviço para gerenciar push notifications via Supabase

import { customSupabaseClient } from '@/lib/customSupabaseClient'

const supabase = customSupabaseClient

class PushNotificationService {
  constructor() {
    this.registration = null
    this.subscription = null
    this.isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
  }

  /**
   * Registrar Service Worker
   */
  async registerServiceWorker() {
    if (!this.isSupported) {
      console.log('Push notifications não suportadas neste navegador')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      })

      console.log('✅ Service Worker registrado:', this.registration)
      return true
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error)
      return false
    }
  }

  /**
   * Solicitar permissão de notificações
   */
  async requestPermission() {
    if (!this.isSupported) return false

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  /**
   * Inscrever em push notifications
   */
  async subscribe(clinicId, userId) {
    if (!this.isSupported) {
      console.log('Push notifications não suportadas')
      return null
    }

    try {
      // Registrar service worker se não estiver
      if (!this.registration) {
        await this.registerServiceWorker()
      }

      // Solicitar permissão
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        console.log('Permissão de notificação negada')
        return null
      }

      // Obter VAPID public key do backend
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.warn('VAPID public key não configurada')
        return null
      }

      // Converter VAPID para Uint8Array
      const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey)

      // Inscrever em push
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })

      this.subscription = subscription

      // Salvar subscription no banco de dados
      await this.savePushSubscription(
        clinicId,
        userId,
        subscription
      )

      console.log('✅ Push subscription ativo:', subscription)
      return subscription
    } catch (error) {
      console.error('❌ Erro ao inscrever em push:', error)
      return null
    }
  }

  /**
   * Desinscrever de push notifications
   */
  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe()
        this.subscription = null
        console.log('✅ Push subscription removida')
        return true
      }
    } catch (error) {
      console.error('❌ Erro ao desinscrever de push:', error)
      return false
    }
  }

  /**
   * Salvar subscription no banco de dados
   */
  async savePushSubscription(clinicId, userId, subscription) {
    try {
      const subscriptionData = {
        clinic_id: clinicId,
        user_id: userId,
        endpoint: subscription.endpoint,
        auth: subscription.getKey('auth')
          ? btoa(String.fromCharCode.apply(null, subscription.getKey('auth')))
          : null,
        p256dh: subscription.getKey('p256dh')
          ? btoa(String.fromCharCode.apply(null, subscription.getKey('p256dh')))
          : null,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      }

      // Primeiro, tentar inserir
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert([subscriptionData])

      // Se já existe, atualizar
      if (insertError && insertError.code === '23505') {
        await supabase
          .from('push_subscriptions')
          .update(subscriptionData)
          .eq('user_id', userId)
      }

      console.log('✅ Push subscription salva no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar push subscription:', error)
    }
  }

  /**
   * Testar push notification
   */
  async sendTestNotification() {
    try {
      if (!this.registration) {
        await this.registerServiceWorker()
      }

      const notificationOptions = {
        title: '🧪 Teste de Notificação Push',
        body: 'Esta é uma notificação de teste do Gesclinic',
        icon: '/logo.png',
        badge: '/logo-badge.png',
        tag: 'test-notification',
        data: {
          alertId: 'test',
          url: '/clinica/financeiro/alerts',
        },
      }

      await this.registration.showNotification(
        notificationOptions.title,
        notificationOptions
      )

      console.log('✅ Notificação de teste enviada')
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error)
    }
  }

  /**
   * Converter VAPID key do formato base64url para Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * Verificar status da subscription
   */
  async getSubscriptionStatus() {
    try {
      if (!this.registration) {
        return { subscribed: false, reason: 'Service Worker not registered' }
      }

      const subscription = await this.registration.pushManager.getSubscription()

      return {
        subscribed: !!subscription,
        subscription: subscription,
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status da subscription:', error)
      return { subscribed: false, reason: error.message }
    }
  }

  /**
   * Subscribe to real-time push updates
   */
  subscribeToUpdates(userId, callback) {
    try {
      const channel = supabase
        .channel(`push_notifications:user_id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'push_notifications',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            console.log('Push notification received:', payload)
            callback(payload.new)
          }
        )
        .subscribe()

      return channel
    } catch (error) {
      console.error('Error subscribing to push updates:', error)
      return null
    }
  }
}

// Export singleton instance
export default new PushNotificationService()
