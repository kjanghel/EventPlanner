import { useState } from 'react'
import { createPerson, type Person } from '../../lib/queries'

interface PersonFormSheetProps {
  eventId: string
  onAdded: (person: Person) => void
  onClose: () => void
}

export function PersonFormSheet({ eventId, onAdded, onClose }: PersonFormSheetProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setBusy(true)
    try {
      const person = await createPerson(eventId, {
        name,
        phone_e164: phone.trim() || null,
      })
      onAdded(person)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add person')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Vivek"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Phone <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="flex-1 bg-slate-900 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-slate-100 text-slate-900 rounded-lg py-2 px-3 text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
    </form>
  )
}
