import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createEvent } from '../../lib/queries'

export function NewEventSheet() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setBusy(true)
    try {
      const created = await createEvent({
        name,
        event_date: eventDate || null,
      })
      navigate(`/events/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500">← Back</Link>
        <h1 className="text-base font-semibold">New event</h1>
        <span className="w-12" />
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shadi"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Event date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create event'}
          </button>

          {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
        </form>
      </main>
    </div>
  )
}
