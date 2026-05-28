import { useEffect, useState } from 'react'
import { createScheduledPayment, listPeople, type ScheduledPayment, type Person } from '../../lib/queries'

interface ScheduledFormSheetProps {
  eventId: string
  categoryId: string
  onAdded: (sp: ScheduledPayment) => void
  onClose: () => void
}

export function ScheduledFormSheet({ eventId, categoryId, onAdded, onClose }: ScheduledFormSheetProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState<string>('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPeople(eventId).then(setPeople).catch(console.error)
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dueDate || !amount.trim() || parseFloat(amount) <= 0) {
      setError('Please fill in all fields. Amount must be greater than 0.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const sp = await createScheduledPayment({
        event_id: eventId,
        category_id: categoryId,
        due_date: dueDate,
        expected_amount: parseFloat(amount),
        expected_payer_id: payerId || null,
        note: note.trim() || undefined,
      })
      onAdded(sp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add scheduled payment')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Due date</label>
        <input
          autoFocus
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Expected amount (₹)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Expected payer <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">No one assigned</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Note <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Final payment"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !dueDate || !amount.trim()}
          className="flex-1 bg-teal-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
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
