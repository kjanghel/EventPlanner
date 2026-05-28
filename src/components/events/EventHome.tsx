import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { getEvent, type EventTotals } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { QuickAddFab } from '../quickadd/QuickAddFab'

const tabs = [
  { to: 'summary', label: 'Summary' },
  { to: 'budget', label: 'Budget' },
  { to: 'upcoming', label: 'Upcoming' },
  { to: 'people', label: 'People' },
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
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500">← Events</Link>
        <h1 className="text-base font-semibold truncate max-w-[60%]">
          {event?.name ?? 'Event'}
        </h1>
        <Link to={`/events/${id}/settings`} className="text-sm text-slate-500">⚙</Link>
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
        <ul className="grid grid-cols-4 max-w-md mx-auto">
          {tabs.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  `block text-center py-3 text-xs ${
                    isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'
                  }`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
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
