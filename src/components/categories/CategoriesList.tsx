import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { listCategories, type CategoryTotals, deleteCategory } from '../../lib/queries'
import { CategoryFormSheet } from './CategoryFormSheet'
import type { EventOutletContext } from '../events/EventHome'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function CategoriesList() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const [categories, setCategories] = useState<CategoryTotals[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!eventId) return
    let isMounted = true
    const timeout = setTimeout(() => {
      if (isMounted) {
        setError('Request timed out. Please refresh.')
        setCategories(null)
      }
    }, 8000)

    listCategories(eventId)
      .then((c) => {
        if (isMounted) setCategories(c)
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [eventId, refreshTick])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      await deleteCategory(id)
      setCategories((prev) => prev?.filter((c) => c.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const handleCategoryAdded = (category: CategoryTotals) => {
    setCategories((prev) => [...(prev ?? []), category].sort((a, b) => a.sort_order - b.sort_order))
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      {categories === null && !error && (
        <p className="text-sm text-slate-500 text-center py-8">Loading categories…</p>
      )}

      {categories?.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No categories yet.</p>
      )}

      <ul className="space-y-2">
        {categories?.map((cat) => (
          <li key={cat.id}>
            <Link
              to={`/events/${eventId}/budget/${cat.id}`}
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{cat.name}</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(cat.id)
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              {cat.note && <p className="text-xs text-slate-500 mb-2">{cat.note}</p>}
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-slate-400">Planned</dt>
                  <dd className="font-mono">₹{formatINR(cat.planned_amount ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Confirmed</dt>
                  <dd className="font-mono">₹{formatINR(cat.confirmed_amount ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Paid</dt>
                  <dd className="font-mono">₹{formatINR(cat.paid_total)}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium"
        >
          + Add category
        </button>
      ) : (
        <CategoryFormSheet eventId={eventId!} onAdded={handleCategoryAdded} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
