import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Caregiver } from '@/lib/types'

type PushSupport = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function isIos() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

async function saveSubscription(subscription: PushSubscription, caregiver: Caregiver) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Suscripción incompleta')
  }
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      caregiver,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

function initialSupport(): PushSupport {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  if (isIos() && !isStandalone()) return 'ios-install'
  if (Notification.permission === 'denied') return 'denied'
  return 'off'
}

export function usePushSubscription(caregiver: Caregiver) {
  const [support, setSupport] = useState<PushSupport>(initialSupport)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (isIos() && !isStandalone()) return
    if (Notification.permission === 'denied') return
    let cancelled = false

    async function load() {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (cancelled) return
      if (existing && isSupabaseConfigured) {
        try {
          await saveSubscription(existing, caregiver)
        } catch {
          // The browser subscription still counts as on; the next toggle retries the save.
        }
      }
      if (!cancelled) setSupport(existing ? 'on' : 'off')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [caregiver])

  async function enable() {
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicKey) throw new Error('Falta VITE_VAPID_PUBLIC_KEY')
    if (!isSupabaseConfigured) throw new Error('Falta configurar Supabase')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setSupport(permission === 'denied' ? 'denied' : 'off')
      throw new Error('No se concedió permiso para avisos')
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await saveSubscription(subscription, caregiver)
    setSupport('on')
  }

  async function disable() {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
        if (error) throw error
      }
    }
    setSupport('off')
  }

  async function toggle() {
    setBusy(true)
    try {
      if (support === 'on') await disable()
      else await enable()
    } finally {
      setBusy(false)
    }
  }

  return { support, busy, toggle }
}
