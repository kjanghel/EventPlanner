import { useState } from 'react'
import { createCategory, type CategoryTotals } from '../../lib/queries'
import { useT } from '../../lib/i18n'

interface CategoryFormSheetProps {
  eventId: string
  onAdded: (category: CategoryTotals) => void
  onClose: () => void
}

export function CategoryFormSheet({ eventId, onAdded, onClose }: CategoryFormSheetProps) {
  const t = useT()
  const [name, setName] = useState('')
  const [planned, setPlanned] = useState('')
  const [confirmed, setConfirmed] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setBusy(true)
    try {
      const data = await createCategory(eventId, {
        name,
        planned_amount: planned ? parseFloat(planned) : null,
        confirmed_amount: confirmed ? parseFloat(confirmed) : null,
        note: note.trim() || null,
      })
      onAdded({
        ...data,
        paid_total: 0,
        scheduled_total: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotAdd'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.categoryName')}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('categories.namePlaceholder')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.plannedAmount')}</label>
          <input
            type="number"
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.confirmedAmount')}</label>
          <input
            type="number"
            value={confirmed}
            onChange={(e) => setConfirmed(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {t('categories.note')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('categories.notePlaceholder')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
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
