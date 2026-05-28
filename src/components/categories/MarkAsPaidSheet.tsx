import { useEffect, useState } from 'react'
import {
  listPeople,
  markScheduledAsPaid,
  type Person,
  type ScheduledPayment,
  type Transaction,
} from '../../lib/queries'

interface MarkAsPaidSheetProps {
  eventId: string
  scheduledId: string
  expectedAmount: number
  expectedPayerId?: string | null
  onSuccess: (result: { scheduled: ScheduledPayment; transaction: Transaction }) => void
  onClose: () => void
}

export function MarkAsPaidSheet({
  eventId,
  scheduledId,
  expectedAmount,
  expectedPayerId,
  onSuccess,
  onClose,
}: MarkAsPaidSheetProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [personId, setPersonId] = useState<string>(expectedPayerId ?? '')
  const [amount, setAmount] = useState(String(expectedAmount))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPeople(eventId).then(setPeople).catch(console.error)
  }, [eventId])

  const paidAmount = parseFloat(amount)
  const isPartial = !isNaN(paidAmount) && paidAmount > 0 && paidAmount < expectedAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount.trim() || isNaN(paidAmount) || paidAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await markScheduledAsPaid(scheduledId, {
        event_id: eventId,
        person_id: personId || null,
        amount: paidAmount,
        note: note.trim() || undefined,
      })
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark as paid')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-sm">Mark as Paid</h3>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Amount paid (₹)</label>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        {isPartial && (
          <p className="text-xs text-amber-700 mt-1">
            Partial: ₹{(expectedAmount - paidAmount).toFixed(0)} will remain pending.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Paid by</label>
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">Select person...</option>
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
          placeholder="e.g. Paid via bank transfer"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-green-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Saving…' : isPartial ? 'Record partial' : 'Mark as Paid'}
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
