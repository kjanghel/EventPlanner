import { useEffect, useMemo, useState } from 'react'
import {
  createTransaction,
  createScheduledPayment,
  listCategories,
  listPeople,
  uploadReceipt,
  setTransactionReceipt,
  type CategoryTotals,
  type Person,
} from '../../lib/queries'
import { compressImage } from '../../lib/images'
import { useT } from '../../lib/i18n'

type Mode = 'txn' | 'scheduled'

interface Props {
  eventId: string
  onSaved: () => void
}

export function QuickAddFab({ eventId, onSaved }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('quickAdd.label')}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 w-14 h-14 rounded-full bg-[#ff7e6b] text-white text-2xl font-light shadow-lg flex items-center justify-center hover:bg-[#f56a55] active:scale-95 transition"
      >
        +
      </button>

      {open && (
        <QuickAddSheet
          eventId={eventId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            onSaved()
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function QuickAddSheet({
  eventId,
  onClose,
  onSaved,
}: {
  eventId: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('txn')
  const [categories, setCategories] = useState<CategoryTotals[]>([])
  const [people, setPeople] = useState<Person[]>([])

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [personId, setPersonId] = useState('')
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listCategories(eventId), listPeople(eventId)])
      .then(([c, p]) => {
        setCategories(c)
        setPeople(p)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId])

  const canSave = useMemo(() => {
    const amt = parseFloat(amount)
    if (!categoryId || isNaN(amt) || amt <= 0) return false
    if (mode === 'txn' && !personId) return false
    if (mode === 'scheduled' && !dueDate) return false
    return true
  }, [amount, categoryId, mode, personId, dueDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'txn') {
        const txn = await createTransaction({
          event_id: eventId,
          category_id: categoryId,
          person_id: personId,
          amount: parseFloat(amount),
          txn_date: txnDate,
          note: note.trim() || undefined,
        })
        if (receipt) {
          try {
            const blob = await compressImage(receipt)
            const path = await uploadReceipt(eventId, txn.id, blob)
            await setTransactionReceipt(txn.id, path)
          } catch (uploadErr) {
            // Save succeeded; just surface the receipt failure without rolling back.
            console.error('Receipt upload failed:', uploadErr)
          }
        }
      } else {
        await createScheduledPayment({
          event_id: eventId,
          category_id: categoryId,
          due_date: dueDate,
          expected_amount: parseFloat(amount),
          expected_payer_id: personId || null,
          note: note.trim() || undefined,
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.saveFailed'))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t('quickAdd.title')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label={t('quickAdd.close')}
          >
            ×
          </button>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-lg p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode('txn')}
            className={`py-2 text-sm font-medium rounded-md transition ${
              mode === 'txn' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('quickAdd.transaction')}
          </button>
          <button
            type="button"
            onClick={() => setMode('scheduled')}
            className={`py-2 text-sm font-medium rounded-md transition ${
              mode === 'scheduled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('quickAdd.scheduled')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('quickAdd.amount')}</label>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('quickAdd.category')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t('quickAdd.selectCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">{t('quickAdd.noCategoriesHint')}</p>
            )}
          </div>

          {mode === 'txn' ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.dueDate')}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('categories.expectedPayer')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
                </label>
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">{t('categories.noOneAssigned')}</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t('quickAdd.note')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !canSave}
              className="flex-1 bg-teal-600 text-white rounded-lg py-2.5 px-3 text-sm font-medium disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-900 rounded-lg py-2.5 px-3 text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
