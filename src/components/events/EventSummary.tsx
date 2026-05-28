import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  getEvent,
  listCategories,
  listPersonTotals,
  type CategoryTotals,
  type EventTotals,
  type PersonTotals,
} from '../../lib/queries'
import type { EventOutletContext } from './EventHome'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function EventSummary() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [people, setPeople] = useState<PersonTotals[] | null>(null)
  const [categories, setCategories] = useState<CategoryTotals[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    setError(null)
    Promise.all([
      getEvent(eventId).then(setEvent),
      listPersonTotals(eventId).then(setPeople),
      listCategories(eventId).then(setCategories),
    ]).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId, refreshTick])

  const insights = useMemo(() => {
    if (!event || !categories) return null
    const daysToEvent = event.event_date
      ? Math.ceil(
          (new Date(event.event_date + 'T00:00:00').getTime() -
            new Date(new Date().toDateString()).getTime()) /
            86_400_000
        )
      : null
    const overBudget = categories.filter(
      (c) => c.confirmed_amount != null && c.paid_total > c.confirmed_amount
    )
    const top = categories.length
      ? [...categories].sort((a, b) => b.paid_total - a.paid_total)[0]
      : null
    const topShare =
      top && event.paid_total > 0
        ? Math.round((top.paid_total / event.paid_total) * 100)
        : 0
    return { daysToEvent, overBudget, top, topShare }
  }, [event, categories])

  if (error) {
    return <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
  }
  if (!event || people === null || categories === null) {
    return <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
  }

  // Confirmed vs Planned: negative diff = saved (green); positive = over plan (red)
  const confirmedVsPlanned = event.confirmed_total - event.planned_total
  // Paid vs Confirmed: negative diff = remaining (green); positive = over confirmed (red)
  const paidVsConfirmed = event.paid_total - event.confirmed_total
  const hasPlanned = event.planned_total > 0
  const hasConfirmed = event.confirmed_total > 0

  return (
    <div className="space-y-4">
      {/* Totals card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-3">Totals</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Planned</dt>
            <dd className="font-mono">₹{formatINR(event.planned_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Confirmed</dt>
            <dd className="font-mono">₹{formatINR(event.confirmed_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Paid</dt>
            <dd className="font-mono">₹{formatINR(event.paid_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Scheduled</dt>
            <dd className="font-mono">₹{formatINR(event.scheduled_total)}</dd>
          </div>
        </dl>
      </div>

      {/* Comparison card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Confirmed vs Planned
          </h3>
          {!hasPlanned && !hasConfirmed ? (
            <p className="text-xs text-slate-500">Set planned and confirmed amounts on categories.</p>
          ) : (
            <>
              <p className={`text-lg font-mono ${confirmedVsPlanned > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ₹{formatINR(Math.abs(confirmedVsPlanned))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {confirmedVsPlanned > 0
                  ? 'over plan'
                  : confirmedVsPlanned < 0
                  ? 'saved vs plan'
                  : 'matches plan'}
              </p>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Paid vs Confirmed
          </h3>
          {!hasConfirmed ? (
            <p className="text-xs text-slate-500">No confirmed amount set.</p>
          ) : (
            <>
              <p className={`text-lg font-mono ${paidVsConfirmed > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ₹{formatINR(Math.abs(paidVsConfirmed))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidVsConfirmed > 0
                  ? 'over confirmed'
                  : paidVsConfirmed < 0
                  ? 'remaining to pay'
                  : 'fully paid'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Insights */}
      {insights && (insights.daysToEvent != null || insights.top || insights.overBudget.length > 0) && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">Insights</h2>
          <ul className="space-y-2 text-sm">
            {insights.daysToEvent != null && (
              <li className="flex items-center justify-between">
                <span className="text-slate-600">
                  {insights.daysToEvent > 0
                    ? 'Days to event'
                    : insights.daysToEvent === 0
                    ? 'Event is today'
                    : 'Days since event'}
                </span>
                <span className="font-mono">
                  {insights.daysToEvent === 0 ? '🎉' : Math.abs(insights.daysToEvent)}
                </span>
              </li>
            )}
            {insights.overBudget.length > 0 && (
              <li className="flex items-start justify-between gap-3">
                <span className="text-red-700">
                  Over budget · {insights.overBudget.length}{' '}
                  {insights.overBudget.length === 1 ? 'category' : 'categories'}
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
            {insights.top && insights.top.paid_total > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-slate-600 truncate">
                  Top spend · {insights.top.name}
                </span>
                <span className="font-mono text-xs">
                  ₹{formatINR(insights.top.paid_total)}
                  {insights.topShare > 0 && (
                    <span className="text-slate-400"> · {insights.topShare}%</span>
                  )}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Per-person breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-3">Paid by person</h2>
        {people.length === 0 ? (
          <p className="text-xs text-slate-500">No people added yet.</p>
        ) : (
          <ul className="space-y-2">
            {people.map((p) => (
              <li key={p.person_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.name}</span>
                <span className="font-mono">₹{formatINR(p.paid_total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
