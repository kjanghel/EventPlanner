// Service worker for Web Push notifications.
//
// Receives push events from the Supabase Edge Function (which calls the
// Web Push protocol with our VAPID keys) and shows OS-level notifications.
// On tap, opens the app to the URL the server included in the payload.
//
// Served from /EventPlanner/sw.js so its scope is the whole app path.
// Browsers limit a SW's scope to its own directory and below.

const APP_PATH = '/EventPlanner/'

self.addEventListener('install', (event) => {
  // Activate immediately on first install so the very first notification
  // after subscribing can be received without a manual refresh.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Event Planner', body: event.data.text() }
  }

  const title = payload.title || 'Event Planner'
  const body = payload.body || ''
  const url = payload.url || APP_PATH

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: APP_PATH + 'logo.svg',
      badge: APP_PATH + 'logo.svg',
      tag: payload.tag || 'eventplanner-reminder',
      // renotify=true so multiple identically-tagged pushes still alert;
      // otherwise the second one would silently replace the first.
      renotify: true,
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || APP_PATH

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        // Focus an existing tab if one's already showing the app, otherwise
        // open a new one.
        const existing = wins.find((w) => w.url.includes(APP_PATH))
        if (existing) {
          existing.focus()
          if ('navigate' in existing) existing.navigate(url)
          return
        }
        return self.clients.openWindow(url)
      })
  )
})
