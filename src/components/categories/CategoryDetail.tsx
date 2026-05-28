import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import type { EventOutletContext } from '../events/EventHome'
import {
  listTransactions,
  listScheduledPayments,
  listPeople,
  getCategoryTotals,
  deleteTransaction,
  deleteScheduledPayment,
  type Transaction,
  type ScheduledPayment,
  type Person,
  type CategoryTotals,
} from '../../lib/queries'
import { TransactionFormSheet } from './TransactionFormSheet'
import { ScheduledFormSheet } from './ScheduledFormSheet'
import { MarkAsPaidSheet } from './MarkAsPaidSheet'
import { TransactionReceiptActions } from './TransactionReceiptActions'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })
}

export function CategoryDetail() {
  const { id: eventId, catId } = useParams<{ id: string; catId: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const [category, setCategory] = useState<CategoryTotals | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [scheduled, setScheduled] = useState<ScheduledPayment[] | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showTxnForm, setShowTxnForm] = useState(false)
  const [showScheduledForm, setShowScheduledForm] = useState(false)
  const [markPaidFor, setMarkPaidFor] = useState<ScheduledPayment | null>(null)

  useEffect(() => {
    if (!catId || !eventId) return
    setError(null)
    Promise.all([
      getCategoryTotals(catId).then(setCategory),
      listTransactions(catId).then(setTransactions),
      listScheduledPayments(catId).then(setScheduled),
      listPeople(eventId).then(setPeople),
    ]).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [catId, eventId, refreshTick])

  const peopleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of people) m.set(p.id, p.name)
    return m
  }, [people])

  const handleDeleteTxn = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev?.filter((t) => t.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Delete this scheduled payment?')) return
    try {
      await deleteScheduledPayment(id)
      setScheduled((prev) => prev?.filter((s) => s.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const remaining =
    category && category.confirmed_amount != null
      ? category.confirmed_amount - category.paid_total
      : null

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      {/* Category header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{category?.name ?? 'Category'}</h2>
          <Link to={`/events/${eventId}/budget`} className="text-xs text-slate-500">
            ← Budget
          </Link>
        </div>
        {category?.note && <p className="text-xs text-slate-500 mb-3">{category.note}</p>}
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-400">Planned</dt>
            <dd className="font-mono">₹{formatINR(category?.planned_amount ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Confirmed</dt>
            <dd className="font-mono">₹{formatINR(category?.confirmed_amount ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Paid</dt>
            <dd className="font-mono">₹{formatINR(category?.paid_total ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{remaining != null && remaining < 0 ? 'Over' : 'Remaining'}</dt>
            <dd className="font-mono">
              {remaining != null ? `₹${formatINR(Math.abs(remaining))}` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Transactions</h3>
        {transactions === null ? (
          <p className="text-xs text-slate-500">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-slate-500">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((txn) => {
              const payer = txn.person_id ? peopleById.get(txn.person_id) : null
              return (
                <li key={txn.id}>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">₹{formatINR(txn.amount)}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(txn.txn_date)}
                          {payer && <> · {payer}</>}
                        </p>
                        {txn.note && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{txn.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTxn(txn.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <TransactionReceiptActions
                        eventId={eventId!}
                        transactionId={txn.id}
                        receiptPath={txn.receipt_path}
                        onChange={(path) =>
                          setTransactions((prev) =>
                            prev?.map((t) => (t.id === txn.id ? { ...t, receipt_path: path } : t)) ?? null
                          )
                        }
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {!showTxnForm && (
          <button
            onClick={() => setShowTxnForm(true)}
            className="w-full mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg py-2 border border-slate-200"
          >
            + Add transaction
          </button>
        )}
        {showTxnForm && (
          <TransactionFormSheet
            eventId={eventId!}
            categoryId={catId!}
            onAdded={(txn) => {
              setTransactions((prev) => [txn, ...(prev ?? [])])
              setShowTxnForm(false)
              getCategoryTotals(catId!).then(setCategory).catch(() => {})
            }}
            onClose={() => setShowTxnForm(false)}
          />
        )}
      </div>

      {/* Scheduled Payments */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Scheduled Payments</h3>
        {scheduled === null ? (
          <p className="text-xs text-slate-500">Loading...</p>
        ) : scheduled.length === 0 ? (
          <p className="text-xs text-slate-500">No scheduled payments yet.</p>
        ) : (
          <ul className="space-y-2">
            {scheduled
              .filter((s) => s.status !== 'cancelled')
              .map((sp) => {
                const payer = sp.expected_payer_id ? peopleById.get(sp.expected_payer_id) : null
                return (
                <li key={sp.id}>
                  <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">₹{formatINR(sp.expected_amount)}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(sp.due_date)}
                        {payer && <> · {payer}</>}
                      </p>
                      {sp.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{sp.note}</p>}
                      {sp.status === 'paid' && <p className="text-xs text-green-600 font-medium mt-0.5">Paid</p>}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {sp.status === 'pending' && (
                        <button
                          onClick={() => setMarkPaidFor(sp)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                        >
                          Mark paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteScheduled(sp.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
                )
              })}
          </ul>
        )}
        {!showScheduledForm && (
          <button
            onClick={() => setShowScheduledForm(true)}
            className="w-full mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg py-2 border border-slate-200"
          >
            + Add scheduled payment
          </button>
        )}
        {showScheduledForm && (
          <ScheduledFormSheet
            eventId={eventId!}
            categoryId={catId!}
            onAdded={(sp) => {
              setScheduled((prev) =>
                [...(prev ?? []), sp].sort(
                  (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                )
              )
              setShowScheduledForm(false)
              getCategoryTotals(catId!).then(setCategory).catch(() => {})
            }}
            onClose={() => setShowScheduledForm(false)}
          />
        )}
      </div>

      {/* Mark as paid sheet */}
      {markPaidFor && (
        <MarkAsPaidSheet
          eventId={eventId!}
          scheduledId={markPaidFor.id}
          expectedAmount={markPaidFor.expected_amount}
          expectedPayerId={markPaidFor.expected_payer_id}
          onSuccess={(result) => {
            setScheduled((prev) =>
              prev?.map((sp) => (sp.id === markPaidFor.id ? result.scheduled : sp)) ?? null
            )
            setTransactions((prev) => [result.transaction, ...(prev ?? [])])
            setMarkPaidFor(null)
            getCategoryTotals(catId!).then(setCategory).catch(() => {})
          }}
          onClose={() => setMarkPaidFor(null)}
        />
      )}
    </div>
  )
}
