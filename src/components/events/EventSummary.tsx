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
import { formatAmount, useT } from '../../lib/i18n'

export function EventSummary() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const t = useT()
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
              <p className={`text-lg font-mono ${confirmedVsPlanned > 0 ? 'text-red-700' : 'text-green-700'}`}>
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
              <p className={`text-lg font-mono ${paidVsConfirmed > 0 ? 'text-red-700' : 'text-green-700'}`}>
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

      {insights && (insights.daysToEvent != null || insights.top || insights.overBudget.length > 0) && (
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
            {insights.top && insights.top.paid_total > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-slate-600 truncate">
                  {t('summary.topSpend', { name: insights.top.name })}
                </span>
                <span className="font-mono text-xs">
                  ₹{formatAmount(insights.top.paid_total)}
                  {insights.topShare > 0 && (
                    <span className="text-slate-400"> · {insights.topShare}%</span>
                  )}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-3">{t('summary.perPerson')}</h2>
        {people.length === 0 ? (
          <p className="text-xs text-slate-500">{t('summary.noPeople')}</p>
        ) : (
          <ul className="space-y-2">
            {people.map((p) => (
              <li key={p.person_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.name}</span>
                <span className="font-mono">₹{formatAmount(p.paid_total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
