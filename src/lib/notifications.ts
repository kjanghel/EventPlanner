// Web Push subscription helpers — browser side.
//
// Flow:
//   1. registerServiceWorker() — call once at app boot from main.tsx
//   2. canUseWebPush() — feature-detect; gate UI on this
//   3. requestPermissionAndSubscribe() — prompts the browser, stores the
//      resulting PushSubscription in Supabase
//   4. unsubscribeFromPush() — undo (used by Settings toggle)
//   5. isPushEnabled() — returns true iff a subscription is currently
//      registered with the browser AND persisted in Supabase
//
// The VAPID public key comes from VITE_VAPID_PUBLIC_KEY at build time.
// In development with no key set, every call short-circuits gracefully.

import { supabase } from './supabase'
import { logError } from './errorLog'

const SW_PATH = '/EventPlanner/sw.js'
const SW_SCOPE = '/EventPlanner/'
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export function canUseWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function hasVapidConfigured(): boolean {
  return VAPID_PUBLIC.length > 0
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseWebPush()) return null
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE })
  } catch (err) {
    void logError('registerServiceWorker', err)
    return null
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseWebPush()) return null
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE)
  return existing ?? null
}

// True if the browser has an active push subscription AND it's recorded
// in our backend. Either side missing ⇒ treat as not subscribed.
export async function isPushEnabled(): Promise<boolean> {
  if (!canUseWebPush() || !hasVapidConfigured()) return false
  if (Notification.permission !== 'granted') return false
  const reg = await getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', sub.endpoint)
    .limit(1)
    .maybeSingle()
  if (error) return false
  return !!data
}

// Convert a base64url-encoded VAPID public key (the format web-push
// outputs) to the Uint8Array form pushManager.subscribe() expects.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const padded = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin)
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'no-vapid' | 'permission-denied' | 'no-user' | 'subscribe-failed' | 'persist-failed' }

export async function requestPermissionAndSubscribe(): Promise<SubscribeResult> {
  if (!canUseWebPush()) return { ok: false, reason: 'unsupported' }
  if (!hasVapidConfigured()) return { ok: false, reason: 'no-vapid' }

  // Prompt OR pick up an already-granted permission. Browsers that have
  // permanently denied return 'denied' immediately with no prompt.
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'permission-denied' }

  const reg = (await getRegistration()) ?? (await registerServiceWorker())
  if (!reg) return { ok: false, reason: 'subscribe-failed' }

  let sub: PushSubscription
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast — TS's Uint8Array generic widens .buffer to ArrayBufferLike
        // while BufferSource demands plain ArrayBuffer. The runtime values
        // are correct; this is a structural-typing nit.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      }))
  } catch (err) {
    void logError('pushManager.subscribe', err)
    return { ok: false, reason: 'subscribe-failed' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'no-user' }

  const p256dh = arrayBufferToBase64(sub.getKey('p256dh'))
  const auth = arrayBufferToBase64(sub.getKey('auth'))

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 500),
      last_active_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  )
  if (error) {
    void logError('push_subscriptions.upsert', error)
    return { ok: false, reason: 'persist-failed' }
  }

  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!canUseWebPush()) return
  const reg = await getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return

  // Tear down the backend row first; if the browser-side unsubscribe
  // fails for any reason we'll still skip sending pushes there.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', sub.endpoint)
  }
  try {
    await sub.unsubscribe()
  } catch {
    /* ignore */
  }
}
