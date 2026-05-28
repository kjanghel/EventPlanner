import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getEvent,
  listPersonTotals,
  type EventTotals,
  type PersonTotals,
} from '../../lib/queries'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function EventSummary() {
  const { id: eventId } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [people, setPeople] = useState<PersonTotals[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    setError(null)
    Promise.all([
      getEvent(eventId).then(setEvent),
      listPersonTotals(eventId).then(setPeople),
    ]).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId])

  if (error) {
    return <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
  }
  if (!event || people === null) {
    return <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
  }

  // Negotiated vs Planned: negative diff = saved (green); positive = over plan (red)
  const negVsPlanned = event.negotiated_total - event.planned_total
  // Paid vs Negotiated: negative diff = remaining (green); positive = over negotiated (red)
  const paidVsNeg = event.paid_total - event.negotiated_total
  const hasPlanned = event.planned_total > 0
  const hasNegotiated = event.negotiated_total > 0

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
            <dt className="text-xs text-slate-400">Negotiated</dt>
            <dd className="font-mono">₹{formatINR(event.negotiated_total)}</dd>
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
            Negotiated vs Planned
          </h3>
          {!hasPlanned && !hasNegotiated ? (
            <p className="text-xs text-slate-500">Set planned and negotiated amounts on categories.</p>
          ) : (
            <>
              <p className={`text-lg font-mono ${negVsPlanned > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ₹{formatINR(Math.abs(negVsPlanned))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {negVsPlanned > 0
                  ? 'over plan'
                  : negVsPlanned < 0
                  ? 'saved through negotiation'
                  : 'matches plan'}
              </p>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Paid vs Negotiated
          </h3>
          {!hasNegotiated ? (
            <p className="text-xs text-slate-500">No negotiated amount set.</p>
          ) : (
            <>
              <p className={`text-lg font-mono ${paidVsNeg > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ₹{formatINR(Math.abs(paidVsNeg))}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidVsNeg > 0
                  ? 'over negotiated'
                  : paidVsNeg < 0
                  ? 'remaining to pay'
                  : 'fully paid'}
              </p>
            </>
          )}
        </div>
      </div>

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
