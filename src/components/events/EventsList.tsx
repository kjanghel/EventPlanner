import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyEvents, type EventTotals } from '../../lib/queries'
import { useAuth } from '../../lib/auth'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function EventsList() {
  const { profile, signOut } = useAuth()
  const [events, setEvents] = useState<EventTotals[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listMyEvents()
      .then(setEvents)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Event Planner</h1>
        <button
          onClick={() => { void signOut().catch(console.error) }}
          className="text-xs text-slate-500 underline"
        >Sign out</button>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-medium">{profile?.display_name ?? profile?.phone_e164}</p>
          </div>
          <Link
            to="/events/new"
            className="bg-slate-900 text-white rounded-lg py-2 px-3 text-sm font-medium"
          >
            + New event
          </Link>
        </div>

        {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 mb-3">{error}</p>}

        {events === null && !error && (
          <p className="text-sm text-slate-500 text-center py-12">Loading events…</p>
        )}

        {events?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-slate-500 mb-2">No events yet.</p>
            <Link to="/events/new" className="text-sm text-slate-900 underline">
              Create your first event
            </Link>
          </div>
        )}

        <ul className="space-y-2">
          {events?.map((e) => (
            <li key={e.event_id}>
              <Link
                to={`/events/${e.event_id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold">{e.name}</h2>
                  {e.event_date && (
                    <span className="text-xs text-slate-500">{e.event_date}</span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-400">Planned</dt>
                    <dd className="font-mono">₹{formatINR(e.planned_total)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Negotiated</dt>
                    <dd className="font-mono">₹{formatINR(e.negotiated_total)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Paid</dt>
                    <dd className="font-mono">₹{formatINR(e.paid_total)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
