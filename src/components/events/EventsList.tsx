import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyEvents, type EventTotals } from '../../lib/queries'
import { useAuth } from '../../lib/auth'
import { UpcomingBanner } from './UpcomingBanner'
import { Brand } from '../brand/Logo'
import { formatAmount, formatDate, useLocale } from '../../lib/i18n'
import {
  canUseWebPush,
  hasVapidConfigured,
  isPushEnabled,
} from '../../lib/notifications'
import { EnableNotificationsModal } from '../notifications/EnableNotificationsModal'

// Persistent ("never ask me again") dismissal lives in localStorage.
// Session dismissal ("skip for now") lives in sessionStorage — re-shown
// on browser reopen.
const NEVER_KEY = 'notifications.neverPrompt'
const SESSION_KEY = 'notifications.dismissedThisSession'

function firstName(name: string | null | undefined, fallback: string) {
  if (!name) return fallback
  return name.trim().split(/\s+/)[0]
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.trim() || '?'
  const parts = source.split(/\s+|@/).filter(Boolean)
  const a = parts[0]?.[0] ?? '?'
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase().slice(0, 2)
}

export function EventsList() {
  const { profile, session, signOut } = useAuth()
  const { locale, t } = useLocale()
  const [events, setEvents] = useState<EventTotals[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)

  useEffect(() => {
    let isMounted = true
    const timeout = setTimeout(() => {
      if (isMounted) {
        setError(t('common.requestTimeout'))
        setEvents(null)
      }
    }, 8000)

    listMyEvents(session)
      .then((e) => {
        if (isMounted) setEvents(e)
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [session, t])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // Notifications opt-in prompt: show once per browser session when the
  // user lands on the events list, unless they're already subscribed,
  // have permanently dismissed, or the browser can't do push at all.
  useEffect(() => {
    if (!session) return
    if (!canUseWebPush() || !hasVapidConfigured()) return
    try {
      if (localStorage.getItem(NEVER_KEY) === '1') return
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
    } catch {
      return
    }
    let cancelled = false
    isPushEnabled().then((enabled) => {
      if (!cancelled && !enabled) setShowNotifPrompt(true)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  const dismissNotifPrompt = (mode: 'dismiss' | 'never') => {
    try {
      if (mode === 'never') localStorage.setItem(NEVER_KEY, '1')
      else sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setShowNotifPrompt(false)
  }

  const email = session?.user?.email ?? null
  const greetingName = firstName(profile?.display_name, email?.split('@')[0] ?? 'there')

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      {showNotifPrompt && (
        <EnableNotificationsModal
          onClose={() => setShowNotifPrompt(false)}
          onDismiss={dismissNotifPrompt}
        />
      )}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Brand />
          <h1 className="sr-only">{t('auth.appTitle')}</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t('account.menuLabel')}
              className="w-9 h-9 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-teal-700 transition"
            >
              {initials(profile?.display_name, email)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="px-3 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium truncate">
                    {profile?.display_name ?? t('account.fallbackName')}
                  </p>
                  {email && (
                    <p className="text-xs text-slate-500 truncate">{email}</p>
                  )}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t('account.editProfile')}
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut().catch(console.error)
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-slate-50 border-t border-slate-100"
                >
                  {t('auth.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-5 max-w-md mx-auto w-full">
        <section className="mb-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t('events.greeting', { name: greetingName })}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('events.subtitle')}</p>
        </section>

        <UpcomingBanner />

        {error && (
          <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 mb-3">{error}</p>
        )}

        {events === null && !error && (
          <p className="text-sm text-slate-500 text-center py-12">{t('common.loadingEvents')}</p>
        )}

        {events?.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto mb-3 flex items-center justify-center text-xl">
              🎉
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">{t('events.empty.title')}</p>
            <p className="text-xs text-slate-500 mb-4">{t('events.empty.body')}</p>
            <Link
              to="/events/new"
              className="inline-block bg-teal-600 text-white rounded-lg py-2 px-4 text-sm font-medium"
            >
              {t('events.empty.cta')}
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <ul className="space-y-3">
            {events.map((e) => {
              const target = e.confirmed_total > 0 ? e.confirmed_total : e.planned_total
              const pct =
                target > 0 ? Math.min(100, Math.round((e.paid_total / target) * 100)) : 0
              return (
                <li key={e.event_id}>
                  <Link
                    to={`/events/${e.event_id}`}
                    className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-base font-semibold leading-tight">{e.name}</h3>
                      {e.event_date && (
                        <span className="shrink-0 text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                          {formatDate(e.event_date, locale)}
                        </span>
                      )}
                    </div>

                    {target > 0 && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{t('events.percentPaid', { pct })}</p>
                      </div>
                    )}

                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-400">{t('events.planned')}</dt>
                        <dd className="font-mono">₹{formatAmount(e.planned_total)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">{t('events.confirmed')}</dt>
                        <dd className="font-mono">₹{formatAmount(e.confirmed_total)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">{t('events.paid')}</dt>
                        <dd className="font-mono">₹{formatAmount(e.paid_total)}</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {events && events.length > 0 && (
        <Link
          to="/events/new"
          aria-label={t('events.newEvent')}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-40 w-14 h-14 rounded-full bg-[#ff7e6b] text-white text-2xl font-light shadow-lg flex items-center justify-center hover:bg-[#f56a55] active:scale-95 transition"
        >
          +
        </Link>
      )}
    </div>
  )
}
