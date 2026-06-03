import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  listCategories,
  listCategoryGroups,
  type CategoryGroup,
  type CategoryTotals,
  deleteCategory,
} from '../../lib/queries'
import { CategoryFormSheet } from './CategoryFormSheet'
import { GroupFormSheet } from './GroupFormSheet'
import type { EventOutletContext } from '../events/EventHome'
import { formatAmount, useT } from '../../lib/i18n'

const HINT_KEY_PREFIX = 'groupsHintDismissed:'

export function CategoriesList() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const t = useT()
  const [categories, setCategories] = useState<CategoryTotals[] | null>(null)
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addCategoryToGroup, setAddCategoryToGroup] = useState<string | null>(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    if (!eventId) return true
    try {
      return localStorage.getItem(HINT_KEY_PREFIX + eventId) === '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!eventId) return
    let isMounted = true
    const timeout = setTimeout(() => {
      if (isMounted) {
        setError(t('common.requestTimeout'))
        setCategories(null)
        setGroups(null)
      }
    }, 8000)

    Promise.all([listCategoryGroups(eventId), listCategories(eventId)])
      .then(([g, c]) => {
        if (!isMounted) return
        setGroups(g)
        setCategories(c)
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [eventId, refreshTick, t])

  const dismissHint = () => {
    setHintDismissed(true)
    if (!eventId) return
    try {
      localStorage.setItem(HINT_KEY_PREFIX + eventId, '1')
    } catch {
      /* ignore */
    }
  }

  // Group the categories by group_id for rendering. Orphan categories
  // (group missing — shouldn't happen post-migration, but defensive) fall
  // into an "Other" bucket so the user still sees them.
  const grouped = useMemo(() => {
    const byGroup = new Map<string, CategoryTotals[]>()
    for (const cat of categories ?? []) {
      const arr = byGroup.get(cat.group_id) ?? []
      arr.push(cat)
      byGroup.set(cat.group_id, arr)
    }
    return byGroup
  }, [categories])

  const handleDelete = async (id: string) => {
    if (!confirm(t('categories.confirmDelete'))) return
    try {
      await deleteCategory(id)
      setCategories((prev) => prev?.filter((c) => c.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotDelete'))
    }
  }

  const handleCategoryAdded = (category: CategoryTotals) => {
    setCategories((prev) =>
      [...(prev ?? []), category].sort((a, b) => a.sort_order - b.sort_order),
    )
    setAddCategoryToGroup(null)
  }

  const handleGroupAdded = (group: CategoryGroup) => {
    setGroups((prev) =>
      [...(prev ?? []), group].sort((a, b) => a.sort_order - b.sort_order),
    )
    setShowGroupForm(false)
  }

  // Hint banner shows only when the event has >= 1 group called "General" and
  // no other groups — that's the post-migration signal that the user hasn't
  // started organising yet.
  const showHint =
    !hintDismissed &&
    groups !== null &&
    groups.length === 1 &&
    groups[0]?.name === 'General' &&
    (categories?.length ?? 0) > 0

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      {(categories === null || groups === null) && !error && (
        <p className="text-sm text-slate-500 text-center py-8">{t('categories.loading')}</p>
      )}

      {showHint && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
          <span className="text-amber-700 font-medium shrink-0">{t('groups.hint.title')}</span>
          <p className="text-amber-900 leading-snug flex-1">{t('groups.hint.body')}</p>
          <button
            onClick={dismissHint}
            className="text-amber-600 hover:text-amber-800 shrink-0 px-1"
            aria-label={t('common.dismiss')}
          >
            ✕
          </button>
        </div>
      )}

      {groups?.length === 0 && categories?.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">{t('categories.empty.title')}</p>
      )}

      {groups?.map((group) => {
        const cats = grouped.get(group.id) ?? []
        const groupPlanned = cats.reduce((s, c) => s + (c.planned_amount ?? 0), 0)
        const groupPaid = cats.reduce((s, c) => s + c.paid_total, 0)
        return (
          <section key={group.id} className="space-y-2">
            <header className="flex items-center justify-between px-1 pt-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">{group.name}</h2>
                <p className="text-[11px] text-slate-500">
                  {t('groups.summary', {
                    paid: formatAmount(groupPaid),
                    planned: formatAmount(groupPlanned),
                  })}
                </p>
              </div>
              <button
                onClick={() => setAddCategoryToGroup(group.id)}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium"
              >
                + {t('categories.add')}
              </button>
            </header>

            <ul className="space-y-2">
              {cats.map((cat) => (
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
                        <dt className="text-slate-400">{t('categories.planned')}</dt>
                        <dd className="font-mono">₹{formatAmount(cat.planned_amount ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">{t('categories.confirmed')}</dt>
                        <dd className="font-mono">₹{formatAmount(cat.confirmed_amount ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">{t('events.paid')}</dt>
                        <dd className="font-mono">₹{formatAmount(cat.paid_total)}</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>

            {addCategoryToGroup === group.id && (
              <CategoryFormSheet
                eventId={eventId!}
                groupId={group.id}
                onAdded={handleCategoryAdded}
                onClose={() => setAddCategoryToGroup(null)}
              />
            )}
          </section>
        )
      })}

      {showGroupForm ? (
        <GroupFormSheet
          eventId={eventId!}
          onAdded={handleGroupAdded}
          onClose={() => setShowGroupForm(false)}
        />
      ) : (
        groups !== null && (
          <button
            onClick={() => setShowGroupForm(true)}
            className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium"
          >
            + {t('groups.addGroup')}
          </button>
        )
      )}
    </div>
  )
}
