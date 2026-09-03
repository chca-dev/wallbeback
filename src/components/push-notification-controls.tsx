'use client'

import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'

type ControlState = 'checking' | 'unsupported' | 'disabled' | 'enabled' | 'working'

const urlBase64ToUint8Array = (value: string) => {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

const supportsPush = () => (
  'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window
)

export const PushNotificationControls = () => {
  const [controlState, setControlState] = useState<ControlState>('checking')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!supportsPush()) {
      queueMicrotask(() => setControlState('unsupported'))
      return
    }

    void navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription()
      setControlState(subscription ? 'enabled' : 'disabled')
    }).catch(() => setControlState('disabled'))
  }, [])

  const enableNotifications = async () => {
    setControlState('working')
    setMessage(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setControlState('disabled')
        setMessage('Le navigateur n’a pas autorisé les notifications.')
        return
      }

      const configurationResponse = await fetch('/api/push', { cache: 'no-store' })
      const configuration = await configurationResponse.json()
      if (!configurationResponse.ok || !configuration.available || !configuration.publicKey) {
        throw new Error(configuration.message ?? 'Les notifications ne sont pas encore configurées.')
      }

      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(configuration.publicKey),
      })
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'L’activation a échoué.')

      setControlState('enabled')
      setMessage('Les notifications sont actives sur cet appareil.')
    } catch (error) {
      setControlState('disabled')
      setMessage(error instanceof Error ? error.message : 'L’activation a échoué.')
    }
  }

  const disableNotifications = async () => {
    setControlState('working')
    setMessage(null)

    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const response = await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message ?? 'La désactivation a échoué.')
        await subscription.unsubscribe()
      }

      setControlState('disabled')
      setMessage('Les notifications sont désactivées sur cet appareil.')
    } catch (error) {
      setControlState('enabled')
      setMessage(error instanceof Error ? error.message : 'La désactivation a échoué.')
    }
  }

  if (controlState === 'checking') return <p className='text-xs text-muted'>Vérification des notifications…</p>
  if (controlState === 'unsupported') return <p className='text-xs text-muted'>Ce navigateur ne prend pas en charge les notifications Web Push.</p>

  const enabled = controlState === 'enabled'
  return (
    <div>
      <p className='text-sm text-muted'>Reçois les nouvelles publications familiales, même lorsque l’application est fermée.</p>
      <button
        type='button'
        disabled={controlState === 'working'}
        onClick={() => void (enabled ? disableNotifications() : enableNotifications())}
        className='mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50'
      >
        {enabled ? <BellOff size={15} /> : <Bell size={15} />}
        {controlState === 'working' ? 'Patiente…' : enabled ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
      </button>
      {message ? <p aria-live='polite' className='mt-3 text-xs text-muted'>{message}</p> : null}
    </div>
  )
}
