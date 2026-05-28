import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { LayoutDashboard, Wallet, Calendar, Receipt, Users, Settings } from 'lucide-react'
import { getEvent, type EventTotals } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { QuickAddFab } from '../quickadd/QuickAddFab'
import { Logo } from '../brand/Logo'

const tabs = [
  { to: 'summary', label: 'Summary', icon: LayoutDashboard },
  { to: 'budget', label: 'Budget', icon: Wallet },
  { to: 'activity', label: 'Activity', icon: Receipt },
  { to: 'upcoming', label: 'Upcoming', icon: Calendar },
  { to: 'people', label: 'People', icon: Users },
]

export type EventOutletContext = { event: EventTotals | null; refreshTick: number }

export function EventHome() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const timeout = setTimeout(() => {
      if (isMounted) {
        setError('Request timed out. Please refresh.')
        setEvent(null)
      }
    }, 8000)

    getEvent(id)
      .then((e) => {
        if (isMounted) setEvent(e)
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [id])

  // Realtime: subscribe to changes for this event. Coalesce bursts with a
  // 300ms debounce, then bump refreshTick (tabs refetch) + re-pull totals.
  useEffect(() => {
    if (!id) return

    const bump = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1)
        getEvent(id).then(setEvent).catch(() => {})
      }, 300)
    }

    const eventFilter = `event_id=eq.${id}`
    const channel = supabase
      .channel(`event:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: eventFilter }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_payments', filter: eventFilter }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: eventFilter }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people', filter: eventFilter }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_members', filter: eventFilter }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${id}` }, bump)
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [id])

  return (
    <div className="min-h-full flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
            aria-label="Back to events"
          >
            <Logo className="w-6 h-6" />
            <span className="hidden sm:inline">Events</span>
          </Link>
          <h1 className="text-base font-semibold truncate max-w-[55%] text-center">
            {event?.name ?? 'Event'}
          </h1>
          <Link
            to={`/events/${id}/settings`}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Event settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 m-4">{error}</p>
      )}

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <Outlet context={{ event, refreshTick } satisfies EventOutletContext} />
      </main>

      {id && (
        <QuickAddFab
          eventId={id}
          onSaved={() => {
            setRefreshTick((t) => t + 1)
            // Pull fresh event totals so the header summary is up to date.
            getEvent(id).then(setEvent).catch(() => {})
          }}
        />
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5 max-w-md mx-auto">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <li key={t.to}>
                <NavLink to={t.to} className="block">
                  {({ isActive }) => (
                    <div className="flex flex-col items-center pt-2 pb-1.5 gap-0.5">
                      <span
                        className={`inline-flex items-center justify-center h-7 px-3 rounded-full transition ${
                          isActive ? 'bg-teal-100 text-teal-700' : 'text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <span
                        className={`text-[11px] leading-none ${
                          isActive ? 'text-teal-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {t.label}
                      </span>
                    </div>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

// Placeholder tabs — replaced with real content in later phases.
export function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-slate-500">
        <strong>{name}</strong> tab — coming in a later phase.
      </p>
    </div>
  )
}
