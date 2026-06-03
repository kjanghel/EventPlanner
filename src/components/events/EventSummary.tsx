import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  getEvent,
  listCategories,
  listCategoryGroups,
  listEventTransactions,
  listPersonTotals,
  type CategoryGroup,
  type CategoryTotals,
  type EventTotals,
  type LedgerRow,
  type PersonTotals,
} from '../../lib/queries'
import type { EventOutletContext } from './EventHome'
import { formatAmount, useT } from '../../lib/i18n'

type GroupRollup = {
  group: CategoryGroup
  paid: number
  scheduled: number
  confirmed: number
  planned: number
}

export function EventSummary() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const t = useT()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [people, setPeople] = useState<PersonTotals[] | null>(null)
  const [categories, setCategories] = useState<CategoryTotals[] | null>(null)
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null)
  const [transactions, setTransactions] = useState<LedgerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    setError(null)
    Promise.all([
      getEvent(eventId).then(setEvent),
      listPersonTotals(eventId).then(setPeople),
      listCategories(eventId).then(setCategories),
      listCategoryGroups(eventId).then(setGroups),
      listEventTransactions(eventId).then(setTransactions),
    ]).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId, refreshTick])

  const insights = useMemo(() => {
    if (!event || !categories) return null
    const daysToEvent = event.event_date
      ? Math.ceil(
          (new Date(event.event_date + 'T00:00:00').getTime() -
            new Date(new Date().toDateString()).getTime()) /
            86_400_000,
        )
      : null
    const overBudget = categories.filter(
      (c) => c.confirmed_amount != null && c.paid_total > c.confirmed_amount,
    )
    return { daysToEvent, overBudget }
  }, [event, categories])

  const groupRollups = useMemo<GroupRollup[]>(() => {
    if (!groups || !categories) return []
    return groups
      .map((g) => {
        const cats = categories.filter((c) => c.group_id === g.id)
        const paid = cats.reduce((s, c) => s + c.paid_total, 0)
        const scheduled = cats.reduce((s, c) => s + c.scheduled_total, 0)
        const confirmed = cats.reduce((s, c) => s + (c.confirmed_amount ?? 0), 0)
        const planned = cats.reduce(
          (s, c) =>
            s +
            (c.planned_amount && c.planned_amount > 0
              ? c.planned_amount
              : c.confirmed_amount ?? 0),
          0,
        )
        return { group: g, paid, scheduled, confirmed, planned }
      })
      .filter((r) => r.paid > 0 || r.scheduled > 0 || r.planned > 0)
      .sort((a, b) => b.paid - a.paid)
  }, [groups, categories])

  // Cumulative spend over time — for the velocity chart. We bucket by day
  // and emit (date, cumulativeAmount) points sorted ascending.
  const velocity = useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    const byDate = new Map<string, number>()
    for (const tx of transactions) {
      byDate.set(tx.txn_date, (byDate.get(tx.txn_date) ?? 0) + tx.amount)
    }
    const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    let cum = 0
    return sorted.map(([date, amt]) => {
      cum += amt
      return { date, cum }
    })
  }, [transactions])

  const topSpenders = useMemo<PersonTotals[]>(() => {
    if (!people) return []
    return [...people]
      .filter((p) => p.paid_total > 0)
      .sort((a, b) => b.paid_total - a.paid_total)
      .slice(0, 8)
  }, [people])

  if (error) {
    return <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
  }
  if (!event || people === null || categories === null || groups === null || transactions === null) {
    return <p className="text-sm text-slate-500 text-center py-8">{t('common.loading')}</p>
  }

  const confirmedVsPlanned = event.confirmed_total - event.planned_total
  const paidVsConfirmed = event.paid_total - event.confirmed_total
  const hasPlanned = event.planned_total > 0
  const hasConfirmed = event.confirmed_total > 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-3">{t('summary.totals')}</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">{t('events.planned')}</dt>
            <dd className="font-mono">₹{formatAmount(event.planned_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('events.confirmed')}</dt>
            <dd className="font-mono">₹{formatAmount(event.confirmed_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('events.paid')}</dt>
            <dd className="font-mono">₹{formatAmount(event.paid_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('events.scheduled')}</dt>
            <dd className="font-mono">₹{formatAmount(event.scheduled_total)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            {t('summary.confirmedVsPlanned')}
          </h3>
          {!hasPlanned && !hasConfirmed ? (
            <p className="text-xs text-slate-500">{t('summary.setAmountsHint')}</p>
          ) : (
            <>
              <p
                className={`text-lg font-mono ${
                  confirmedVsPlanned > 0 ? 'text-red-700' : 'text-green-700'
                }`}
              >
                ₹{formatAmount(Math.abs(confirmedVsPlanned))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {confirmedVsPlanned > 0
                  ? t('summary.overPlan')
                  : confirmedVsPlanned < 0
                  ? t('summary.savedVsPlan')
                  : t('summary.matchesPlan')}
              </p>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            {t('summary.paidVsConfirmed')}
          </h3>
          {!hasConfirmed ? (
            <p className="text-xs text-slate-500">{t('summary.noConfirmed')}</p>
          ) : (
            <>
              <p
                className={`text-lg font-mono ${
                  paidVsConfirmed > 0 ? 'text-red-700' : 'text-green-700'
                }`}
              >
                ₹{formatAmount(Math.abs(paidVsConfirmed))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidVsConfirmed > 0
                  ? t('summary.overConfirmed')
                  : paidVsConfirmed < 0
                  ? t('summary.remainingToPay')
                  : t('summary.fullyPaid')}
              </p>
            </>
          )}
        </div>
      </div>

      {groupRollups.length > 0 && (
        <GroupSpendCard rollups={groupRollups} t={t} />
      )}

      {velocity.length >= 2 && <VelocityCard data={velocity} t={t} />}

      {topSpenders.length > 0 && <TopSpendersCard people={topSpenders} t={t} />}

      {insights && (insights.daysToEvent != null || insights.overBudget.length > 0) && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">{t('summary.insights')}</h2>
          <ul className="space-y-2 text-sm">
            {insights.daysToEvent != null && (
              <li className="flex items-center justify-between">
                <span className="text-slate-600">
                  {insights.daysToEvent > 0
                    ? t('summary.daysToEvent')
                    : insights.daysToEvent === 0
                    ? t('summary.eventIsToday')
                    : t('summary.daysSinceEvent')}
                </span>
                <span className="font-mono">
                  {insights.daysToEvent === 0 ? '🎉' : Math.abs(insights.daysToEvent)}
                </span>
              </li>
            )}
            {insights.overBudget.length > 0 && (
              <li className="flex items-start justify-between gap-3">
                <span className="text-red-700">
                  {t('summary.overBudget', {
                    count: insights.overBudget.length,
                    countLabel:
                      insights.overBudget.length === 1
                        ? t('summary.categorySingular')
                        : t('summary.categoryPlural'),
                  })}
                </span>
                <span className="text-xs text-slate-500 text-right truncate">
                  {insights.overBudget
                    .slice(0, 2)
                    .map((c) => c.name)
                    .join(', ')}
                  {insights.overBudget.length > 2 && '…'}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// Inline chart components — pure SVG/CSS, no external dependency.
// =========================================================================

function GroupSpendCard({
  rollups,
  t,
}: {
  rollups: GroupRollup[]
  t: ReturnType<typeof useT>
}) {
  // Scale all bars to the same max — the biggest group's planned spend
  // (or paid+scheduled if planned is 0). Lets users compare across groups
  // at a glance.
  const max = Math.max(
    ...rollups.map((r) => Math.max(r.planned, r.paid + r.scheduled, 1)),
  )

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold mb-3">{t('summary.spendByGroup')}</h2>
      <ul className="space-y-3">
        {rollups.map((r) => {
          const paidPct = (r.paid / max) * 100
          const scheduledPct = (r.scheduled / max) * 100
          const plannedPct = Math.max(
            ((r.planned - r.paid - r.scheduled) / max) * 100,
            0,
          )
          return (
            <li key={r.group.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 truncate pr-2">
                  {r.group.name}
                </span>
                <span className="font-mono text-slate-500 shrink-0">
                  ₹{formatAmount(r.paid)}
                  {r.planned > 0 && (
                    <span className="text-slate-400"> / ₹{formatAmount(r.planned)}</span>
                  )}
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-100 overflow-hidden flex"
                role="img"
                aria-label={t('summary.spendByGroup')}
              >
                <span
                  className="bg-teal-500 h-full"
                  style={{ width: `${paidPct}%` }}
                />
                <span
                  className="bg-teal-200 h-full"
                  style={{ width: `${scheduledPct}%` }}
                />
                <span
                  className="bg-slate-300 h-full"
                  style={{ width: `${plannedPct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-teal-500" />
          {t('events.paid')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-teal-200" />
          {t('events.scheduled')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-slate-300" />
          {t('summary.legendRemaining')}
        </span>
      </div>
    </div>
  )
}

function TopSpendersCard({
  people,
  t,
}: {
  people: PersonTotals[]
  t: ReturnType<typeof useT>
}) {
  const max = Math.max(...people.map((p) => p.paid_total), 1)
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold mb-3">{t('summary.topSpenders')}</h2>
      <ul className="space-y-2">
        {people.map((p) => {
          const pct = (p.paid_total / max) * 100
          return (
            <li key={p.person_id} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate pr-2 text-slate-700">{p.name}</span>
                <span className="font-mono text-slate-600 shrink-0">
                  ₹{formatAmount(p.paid_total)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <span
                  className="block h-full bg-teal-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function VelocityCard({
  data,
  t,
}: {
  data: { date: string; cum: number }[]
  t: ReturnType<typeof useT>
}) {
  // Render a small SVG area chart. 320×96 logical viewbox keeps it crisp
  // on phones while staying inside the 16-padded card.
  const W = 320
  const H = 96
  const PAD = 4

  const max = data[data.length - 1]?.cum ?? 1
  const n = data.length

  const points = data.map((d, i) => {
    const x = PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2)
    const y = H - PAD - (d.cum / max) * (H - PAD * 2)
    return `${x},${y}`
  })

  // Build area path: line points → close down to baseline at first/last x.
  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${PAD + (W - PAD * 2)},${H - PAD} L ${PAD},${H - PAD} Z`

  const firstDate = data[0]?.date ?? ''
  const lastDate = data[data.length - 1]?.date ?? ''

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">{t('summary.spendOverTime')}</h2>
        <span className="text-xs font-mono text-slate-500">
          ₹{formatAmount(max)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-24"
        role="img"
        aria-label={t('summary.spendOverTime')}
      >
        <path d={areaPath} fill="rgba(20, 184, 166, 0.15)" />
        <path d={linePath} fill="none" stroke="rgb(13, 148, 136)" strokeWidth={1.5} />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  )
}
