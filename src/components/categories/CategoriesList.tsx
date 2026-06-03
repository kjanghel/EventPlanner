import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
const EXPANDED_KEY_PREFIX = 'groupsExpanded:'

function readExpanded(eventId: string | undefined): Set<string> | null {
  if (!eventId) return null
  try {
    const v = localStorage.getItem(EXPANDED_KEY_PREFIX + eventId)
    if (!v) return null
    const arr = JSON.parse(v) as string[]
    return new Set(arr)
  } catch {
    return null
  }
}

function writeExpanded(eventId: string | undefined, set: Set<string>) {
  if (!eventId) return
  try {
    localStorage.setItem(EXPANDED_KEY_PREFIX + eventId, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function CategoriesList() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const t = useT()
  const [categories, setCategories] = useState<CategoryTotals[] | null>(null)
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addCategoryToGroup, setAddCategoryToGroup] = useState<string | null>(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => readExpanded(eventId) ?? new Set(),
  )
  // On first ever load (no stored state yet) we expand everything so the
  // user sees structure. After they interact, their choices persist.
  const firstLoadDone = useRef(false)
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    if (!eventId) return true
    try {
      return localStorage.getItem(HINT_KEY_PREFIX + eventId) === '1'
    } catch {
      return true
    }
  })

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

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
        // First-time defaults: expand all groups if the user has no stored
        // preference yet. After this run, persistence kicks in.
        if (!firstLoadDone.current) {
          firstLoadDone.current = true
          if (readExpanded(eventId) === null) {
            const all = new Set(g.map((x) => x.id))
            setExpanded(all)
            writeExpanded(eventId, all)
          }
        }
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

  const toggleGroup = (groupId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      writeExpanded(eventId, next)
      return next
    })
  }

  const expandAndScrollTo = (groupId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add(groupId)
      writeExpanded(eventId, next)
      return next
    })
    // Defer one frame so the section is rendered before scrolling.
    requestAnimationFrame(() => {
      sectionRefs.current.get(groupId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const dismissHint = () => {
    setHintDismissed(true)
    if (!eventId) return
    try {
      localStorage.setItem(HINT_KEY_PREFIX + eventId, '1')
    } catch {
      /* ignore */
    }
  }

  // Group categories by group_id for rendering.
  const grouped = useMemo(() => {
    const byGroup = new Map<string, CategoryTotals[]>()
    for (const cat of categories ?? []) {
      const arr = byGroup.get(cat.group_id) ?? []
      arr.push(cat)
      byGroup.set(cat.group_id, arr)
    }
    return byGroup
  }, [categories])

  const allExpanded = (groups?.length ?? 0) > 0 && groups!.every((g) => expanded.has(g.id))

  const toggleAll = () => {
    const next = allExpanded ? new Set<string>() : new Set(groups?.map((g) => g.id) ?? [])
    setExpanded(next)
    writeExpanded(eventId, next)
  }

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
    // Make sure the newly-added category's group is expanded so the user
    // sees it land.
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add(category.group_id)
      writeExpanded(eventId, next)
      return next
    })
    setAddCategoryToGroup(null)
  }

  const handleGroupAdded = (group: CategoryGroup) => {
    setGroups((prev) =>
      [...(prev ?? []), group].sort((a, b) => a.sort_order - b.sort_order),
    )
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add(group.id)
      writeExpanded(eventId, next)
      return next
    })
    setShowGroupForm(false)
  }

  // Hint banner shows only to migrated events (single 'General' group).
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

      {groups && groups.length > 1 && (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 pb-1 min-w-min">
            <button
              onClick={toggleAll}
              className="shrink-0 text-[11px] text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 bg-white [touch-action:manipulation]"
            >
              {allExpanded ? t('groups.collapseAll') : t('groups.expandAll')}
            </button>
            {groups.map((g) => {
              const isOpen = expanded.has(g.id)
              return (
                <button
                  key={g.id}
                  onClick={() => expandAndScrollTo(g.id)}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border [touch-action:manipulation] ${
                    isOpen
                      ? 'bg-teal-50 border-teal-200 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {g.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {groups?.length === 0 && categories?.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">{t('categories.empty.title')}</p>
      )}

      {groups?.map((group) => {
        const cats = grouped.get(group.id) ?? []
        const groupPlanned = cats.reduce((s, c) => s + (c.planned_amount ?? 0), 0)
        const groupPaid = cats.reduce((s, c) => s + c.paid_total, 0)
        const isOpen = expanded.has(group.id)
        return (
          <section
            key={group.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(group.id, el)
              else sectionRefs.current.delete(group.id)
            }}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden scroll-mt-20"
          >
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 [touch-action:manipulation]"
              aria-expanded={isOpen}
            >
              <span className="shrink-0 text-slate-400">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-700 truncate">
                    {group.name}
                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                      ({cats.length})
                    </span>
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    ₹{formatAmount(groupPaid)}
                    {groupPlanned > 0 && (
                      <span className="text-slate-400"> / ₹{formatAmount(groupPlanned)}</span>
                    )}
                  </span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/40">
                <ul className="space-y-2">
                  {cats.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        to={`/events/${eventId}/budget/${cat.id}`}
                        className="block bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 [touch-action:manipulation]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-sm font-semibold">{cat.name}</h3>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              handleDelete(cat.id)
                            }}
                            className="text-xs text-red-600 hover:text-red-700 [touch-action:manipulation]"
                          >
                            ✕
                          </button>
                        </div>
                        {cat.note && <p className="text-[11px] text-slate-500 mb-1.5">{cat.note}</p>}
                        <dl className="grid grid-cols-3 gap-2 text-[11px]">
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

                {addCategoryToGroup === group.id ? (
                  <CategoryFormSheet
                    eventId={eventId!}
                    groupId={group.id}
                    onAdded={handleCategoryAdded}
                    onClose={() => setAddCategoryToGroup(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddCategoryToGroup(group.id)}
                    className="w-full text-xs text-teal-700 hover:text-teal-800 font-medium py-1.5 rounded-lg border border-dashed border-teal-300 bg-white [touch-action:manipulation]"
                  >
                    + {t('categories.add')}
                  </button>
                )}
              </div>
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
            className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium [touch-action:manipulation]"
          >
            + {t('groups.addGroup')}
          </button>
        )
      )}
    </div>
  )
}
