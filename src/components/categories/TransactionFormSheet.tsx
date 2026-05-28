import { useEffect, useState } from 'react'
import { createTransaction, listPeople, type Transaction, type Person } from '../../lib/queries'

interface TransactionFormSheetProps {
  eventId: string
  categoryId: string
  onAdded: (txn: Transaction) => void
  onClose: () => void
}

export function TransactionFormSheet({ eventId, categoryId, onAdded, onClose }: TransactionFormSheetProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [amount, setAmount] = useState('')
  const [personId, setPersonId] = useState<string>('')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPeople(eventId).then(setPeople).catch(console.error)
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const txn = await createTransaction({
        event_id: eventId,
        category_id: categoryId,
        person_id: personId || null,
        amount: parseFloat(amount),
        txn_date: txnDate,
        note: note.trim() || undefined,
      })
      onAdded(txn)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add transaction')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
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
        <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
        <input
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Note <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Advance payment"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !amount.trim()}
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
