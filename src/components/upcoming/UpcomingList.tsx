import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listEventUpcoming, type UpcomingPayment } from '../../lib/queries'
import { MarkAsPaidSheet } from '../categories/MarkAsPaidSheet'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })
}

// Returns ms between today (midnight local) and the given YYYY-MM-DD date.
function daysFromToday(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function urgencyClass(diff: number) {
  if (diff < 0) return 'border-red-300 bg-red-50'
  if (diff <= 7) return 'border-amber-300 bg-amber-50'
  return 'border-slate-200 bg-white'
}

function urgencyLabel(diff: number) {
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7) return `Due in ${diff}d`
  return null
}

export function UpcomingList() {
  const { id: eventId } = useParams<{ id: string }>()
  const [items, setItems] = useState<UpcomingPayment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [markPaidFor, setMarkPaidFor] = useState<UpcomingPayment | null>(null)

  useEffect(() => {
    if (!eventId) return
    setError(null)
    listEventUpcoming(eventId)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId])

  if (error) {
    return <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
  }
  if (items === null) {
    return <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
  }
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No upcoming payments.</p>
  }

  let overdue = 0
  let thisWeek = 0
  for (const it of items) {
    const d = daysFromToday(it.due_date)
    if (d < 0) overdue++
    else if (d <= 7) thisWeek++
  }

  return (
    <div className="space-y-3">
      {(overdue > 0 || thisWeek > 0) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs">
          <p className="font-medium text-amber-900">Needs attention</p>
          <p className="text-amber-800 mt-0.5">
            {overdue > 0 && (
              <>
                <span className="font-semibold">{overdue}</span> overdue
              </>
            )}
            {overdue > 0 && thisWeek > 0 && ' · '}
            {thisWeek > 0 && (
              <>
                <span className="font-semibold">{thisWeek}</span> due this week
              </>
            )}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((sp) => {
          const diff = daysFromToday(sp.due_date)
          const label = urgencyLabel(diff)
          return (
            <li key={sp.id}>
              <div className={`rounded-lg border p-3 text-sm ${urgencyClass(diff)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium truncate">{sp.category_name}</p>
                      <p className="font-mono text-sm">₹{formatINR(sp.expected_amount)}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDate(sp.due_date)}
                      {label && <> · <span className="font-medium">{label}</span></>}
                      {sp.expected_payer_name && <> · {sp.expected_payer_name}</>}
                    </p>
                    {sp.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{sp.note}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setMarkPaidFor(sp)}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-medium"
                  >
                    Mark paid
                  </button>
                  <Link
                    to={`/events/${eventId}/budget/${sp.category_id}`}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded"
                  >
                    Open category
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {markPaidFor && (
        <MarkAsPaidSheet
          eventId={eventId!}
          scheduledId={markPaidFor.id}
          expectedAmount={markPaidFor.expected_amount}
          expectedPayerId={markPaidFor.expected_payer_id}
          onSuccess={(result) => {
            setItems((prev) => {
              if (!prev) return prev
              if (result.scheduled.status === 'paid') {
                return prev.filter((it) => it.id !== markPaidFor.id)
              }
              return prev.map((it) =>
                it.id === markPaidFor.id
                  ? { ...it, expected_amount: result.scheduled.expected_amount }
                  : it
              )
            })
            setMarkPaidFor(null)
          }}
          onClose={() => setMarkPaidFor(null)}
        />
      )}
    </div>
  )
}
