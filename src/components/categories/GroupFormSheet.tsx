import { useState } from 'react'
import { createCategoryGroup, type CategoryGroup } from '../../lib/queries'
import { useT } from '../../lib/i18n'

interface GroupFormSheetProps {
  eventId: string
  onAdded: (group: CategoryGroup) => void
  onClose: () => void
}

export function GroupFormSheet({ eventId, onAdded, onClose }: GroupFormSheetProps) {
  const t = useT()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setBusy(true)
    try {
      const data = await createCategoryGroup(eventId, { name })
      onAdded(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('groups.couldNotAdd'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {t('groups.groupName')}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('groups.namePlaceholder')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="flex-1 bg-teal-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? t('groups.adding') : t('common.add')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm text-slate-600 rounded-lg border border-slate-200"
        >
          {t('common.cancel')}
        </button>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
    </form>
  )
}
