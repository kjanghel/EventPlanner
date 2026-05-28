import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  listEventTransactions,
  listPeople,
  getReceiptSignedUrl,
  type LedgerRow,
  type Person,
} from '../../lib/queries'
import type { EventOutletContext } from '../events/EventHome'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function monthKey(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export function Activity() {
  const { id: eventId } = useParams<{ id: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const [people, setPeople] = useState<Person[]>([])
  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [filterPerson, setFilterPerson] = useState<string>('') // '' = all
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    listPeople(eventId).then(setPeople).catch(() => {})
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    setError(null)
    listEventTransactions(eventId, filterPerson || undefined)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId, filterPerson, refreshTick])

  const totalForFilter = useMemo(
    () => rows?.reduce((acc, r) => acc + r.amount, 0) ?? 0,
    [rows]
  )

  const groups = useMemo(() => {
    if (!rows) return []
    const out: Array<{ label: string; items: LedgerRow[] }> = []
    let currentLabel = ''
    for (const r of rows) {
      const label = monthKey(r.txn_date)
      if (label !== currentLabel) {
        out.push({ label, items: [] })
        currentLabel = label
      }
      out[out.length - 1].items.push(r)
    }
    return out
  }, [rows])

  const handleOpenReceipt = async (path: string) => {
    try {
      const url = await getReceiptSignedUrl(path)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open receipt')
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <FilterChip
          active={filterPerson === ''}
          onClick={() => setFilterPerson('')}
          label="All"
        />
        {people.map((p) => (
          <FilterChip
            key={p.id}
            active={filterPerson === p.id}
            onClick={() => setFilterPerson(p.id)}
            label={p.name}
          />
        ))}
      </div>

      {/* Total card */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {filterPerson
            ? `${people.find((p) => p.id === filterPerson)?.name ?? 'Person'} paid`
            : 'Total paid'}
        </div>
        <div className="text-base font-semibold font-mono">
          ₹{formatINR(totalForFilter)}
        </div>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      {rows === null && !error && (
        <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
      )}

      {rows?.length === 0 && !error && (
        <p className="text-sm text-slate-500 text-center py-8">No transactions yet.</p>
      )}

      {/* Grouped ledger */}
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="text-[11px] uppercase tracking-wide text-slate-400 px-1 mb-1.5">
            {g.label}
          </h3>
          <ul className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {g.items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/events/${eventId}/budget/${r.category_id}`}
                  className="block px-3 py-2.5 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.category_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDay(r.txn_date)}
                        {r.payer_name && <> · {r.payer_name}</>}
                      </p>
                      {r.note && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{r.note}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <p className="text-sm font-mono font-medium">
                        ₹{formatINR(r.amount)}
                      </p>
                      {r.receipt_path && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            void handleOpenReceipt(r.receipt_path!)
                          }}
                          className="text-[11px] text-teal-700 hover:text-teal-800 mt-0.5"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-xs rounded-full px-3 py-1.5 border transition ${
        active
          ? 'bg-teal-600 border-teal-600 text-white'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
