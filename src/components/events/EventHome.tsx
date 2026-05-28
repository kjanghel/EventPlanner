import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { getEvent, type EventTotals } from '../../lib/queries'

const tabs = [
  { to: 'summary', label: 'Summary' },
  { to: 'budget', label: 'Budget' },
  { to: 'upcoming', label: 'Upcoming' },
  { to: 'people', label: 'People' },
]

export function EventHome() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-full flex flex-col pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500">← Events</Link>
        <h1 className="text-base font-semibold truncate max-w-[60%]">
          {event?.name ?? 'Event'}
        </h1>
        <Link to="settings" className="text-sm text-slate-500">⚙</Link>
      </header>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 m-4">{error}</p>
      )}

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <Outlet context={{ event }} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200">
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
