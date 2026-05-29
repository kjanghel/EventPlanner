import { useEffect, useState } from 'react'
import {
  createTransaction,
  listPeople,
  uploadReceipt,
  setTransactionReceipt,
  type Transaction,
  type Person,
} from '../../lib/queries'
import { compressImage } from '../../lib/images'
import { useT } from '../../lib/i18n'

interface TransactionFormSheetProps {
  eventId: string
  categoryId: string
  onAdded: (txn: Transaction) => void
  onClose: () => void
}

export function TransactionFormSheet({ eventId, categoryId, onAdded, onClose }: TransactionFormSheetProps) {
  const t = useT()
  const [people, setPeople] = useState<Person[]>([])
  const [amount, setAmount] = useState('')
  const [personId, setPersonId] = useState<string>('')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPeople(eventId).then(setPeople).catch(console.error)
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError(t('categories.amountGtZero'))
      return
    }
    if (!personId) {
      setError(t('categories.selectPayer'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const txn = await createTransaction({
        event_id: eventId,
        category_id: categoryId,
        person_id: personId,
        amount: parseFloat(amount),
        txn_date: txnDate,
        note: note.trim() || undefined,
      })

      let withReceipt = txn
      if (receipt) {
        try {
          const blob = await compressImage(receipt)
          const path = await uploadReceipt(eventId, txn.id, blob)
          await setTransactionReceipt(txn.id, path)
          withReceipt = { ...txn, receipt_path: path }
        } catch (uploadErr) {
          setError(
            t('categories.txnSavedReceiptFailed', {
              reason: uploadErr instanceof Error ? uploadErr.message : 'unknown',
            }),
          )
        }
      }
      onAdded(withReceipt)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotAddTxn'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t('quickAdd.amount')}</label>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.paidBy')}</label>
        <select
          required
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">{t('quickAdd.selectPerson')}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {people.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">{t('quickAdd.noPeopleHint')}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.date')}</label>
        <input
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {t('categories.note')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('categories.notePlaceholderAdvance')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {t('quickAdd.receipt')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium"
        />
        {receipt && (
          <p className="text-xs text-slate-500 mt-1 truncate">{receipt.name}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !amount.trim() || !personId}
          className="flex-1 bg-teal-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? t('categories.adding') : t('common.add')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-slate-100 text-slate-900 rounded-lg py-2 px-3 text-sm font-medium"
        >
          {t('common.cancel')}
        </button>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
    </form>
  )
}
