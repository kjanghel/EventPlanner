import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllUpcoming, type UpcomingPayment } from '../../lib/queries'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })
}

function daysFromToday(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function urgencyDot(diff: number) {
  if (diff < 0) return 'bg-red-500'
  if (diff <= 7) return 'bg-amber-500'
  return 'bg-slate-300'
}

const SHOW_LIMIT = 5

export function UpcomingBanner() {
  const [items, setItems] = useState<UpcomingPayment[] | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    listAllUpcoming(7)
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (!items || items.length === 0) return null

  let overdue = 0
  let thisWeek = 0
  for (const it of items) {
    const d = daysFromToday(it.due_date)
    if (d < 0) overdue++
    else if (d <= 7) thisWeek++
  }

  const visible = expanded ? items : items.slice(0, SHOW_LIMIT)
  const hiddenCount = items.length - visible.length

  return (
    <section className="bg-white rounded-2xl border border-amber-200 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Needs attention</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {overdue > 0 && (
              <>
                <span className="font-semibold text-red-700">{overdue}</span> overdue
              </>
            )}
            {overdue > 0 && thisWeek > 0 && ' · '}
            {thisWeek > 0 && (
              <>
                <span className="font-semibold text-amber-700">{thisWeek}</span> due this week
              </>
            )}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {visible.map((sp) => {
          const diff = daysFromToday(sp.due_date)
          return (
            <li key={sp.id}>
              <Link
                to={`/events/${sp.event_id}/upcoming`}
                className="flex items-center gap-3 -mx-1 px-1 py-1.5 rounded-md hover:bg-slate-50"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot(diff)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {sp.category_name}
                    <span className="text-slate-400 font-normal"> · {sp.event_name}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(sp.due_date)}
                    {sp.expected_payer_name && <> · {sp.expected_payer_name}</>}
                  </p>
                </div>
                <p className="text-sm font-mono shrink-0">₹{formatINR(sp.expected_amount)}</p>
              </Link>
            </li>
          )
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-slate-500 hover:text-slate-700"
        >
          + {hiddenCount} more
        </button>
      )}
    </section>
  )
}
