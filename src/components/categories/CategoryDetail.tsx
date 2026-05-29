import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import type { EventOutletContext } from '../events/EventHome'
import {
  listTransactions,
  listScheduledPayments,
  listPeople,
  getCategoryTotals,
  updateCategory,
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
import { formatAmount, formatDate, useLocale } from '../../lib/i18n'

export function CategoryDetail() {
  const { id: eventId, catId } = useParams<{ id: string; catId: string }>()
  const { refreshTick } = useOutletContext<EventOutletContext>()
  const { locale, t } = useLocale()
  const [category, setCategory] = useState<CategoryTotals | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [scheduled, setScheduled] = useState<ScheduledPayment[] | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showTxnForm, setShowTxnForm] = useState(false)
  const [showScheduledForm, setShowScheduledForm] = useState(false)
  const [markPaidFor, setMarkPaidFor] = useState<ScheduledPayment | null>(null)
  const [editingCategory, setEditingCategory] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPlanned, setEditPlanned] = useState('')
  const [editConfirmed, setEditConfirmed] = useState('')
  const [editNote, setEditNote] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

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
    if (!confirm(t('categories.confirmDeleteTxn'))) return
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev?.filter((tx) => tx.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotDelete'))
    }
  }

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm(t('categories.confirmDeleteSched'))) return
    try {
      await deleteScheduledPayment(id)
      setScheduled((prev) => prev?.filter((s) => s.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotDelete'))
    }
  }

  const remaining =
    category && category.confirmed_amount != null
      ? category.confirmed_amount - category.paid_total
      : null

  const startEditCategory = () => {
    if (!category) return
    setEditName(category.name)
    setEditPlanned(category.planned_amount != null ? String(category.planned_amount) : '')
    setEditConfirmed(category.confirmed_amount != null ? String(category.confirmed_amount) : '')
    setEditNote(category.note ?? '')
    setEditingCategory(true)
  }

  const saveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catId || !editName.trim()) return
    setSavingCategory(true)
    setError(null)
    try {
      const updated = await updateCategory(catId, {
        name: editName,
        planned_amount: editPlanned.trim() ? parseFloat(editPlanned) : null,
        confirmed_amount: editConfirmed.trim() ? parseFloat(editConfirmed) : null,
        note: editNote.trim() ? editNote : null,
      })
      setCategory((prev) => (prev ? { ...prev, ...updated } : prev))
      setEditingCategory(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.couldNotSave'))
    } finally {
      setSavingCategory(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          {editingCategory ? (
            <span className="text-xs text-slate-500">{t('categories.editingCategory')}</span>
          ) : (
            <h2 className="text-base font-semibold truncate">
              {category?.name ?? t('categories.categoryFallback')}
            </h2>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {!editingCategory && category && (
              <button
                onClick={startEditCategory}
                className="text-slate-400 hover:text-slate-700"
                aria-label={t('categories.editCategory')}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <Link to={`/events/${eventId}/budget`} className="text-xs text-slate-500">
              {t('categories.backBudget')}
            </Link>
          </div>
        </div>

        {!editingCategory ? (
          <>
            {category?.note && <p className="text-xs text-slate-500 mb-3">{category.note}</p>}
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-400">{t('categories.planned')}</dt>
                <dd className="font-mono">₹{formatAmount(category?.planned_amount ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">{t('categories.confirmed')}</dt>
                <dd className="font-mono">₹{formatAmount(category?.confirmed_amount ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">{t('events.paid')}</dt>
                <dd className="font-mono">₹{formatAmount(category?.paid_total ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">
                  {remaining != null && remaining < 0 ? t('categories.over') : t('categories.remaining')}
                </dt>
                <dd className="font-mono">
                  {remaining != null ? `₹${formatAmount(Math.abs(remaining))}` : '—'}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <form onSubmit={saveEditCategory} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('eventSettings.name')}</label>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.plannedAmount')}</label>
                <input
                  type="number"
                  value={editPlanned}
                  onChange={(e) => setEditPlanned(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('categories.confirmedAmount')}</label>
                <input
                  type="number"
                  value={editConfirmed}
                  onChange={(e) => setEditConfirmed(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t('categories.note')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
              </label>
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingCategory || !editName.trim()}
                className="flex-1 bg-teal-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
              >
                {savingCategory ? t('common.saving') : t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditingCategory(false)}
                className="flex-1 bg-slate-100 text-slate-900 rounded-lg py-2 px-3 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t('categories.transactions')}</h3>
        {transactions === null ? (
          <p className="text-xs text-slate-500">{t('common.loading')}</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-slate-500">{t('categories.noTransactions')}</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((txn) => {
              const payer = txn.person_id ? peopleById.get(txn.person_id) : null
              return (
                <li key={txn.id}>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">₹{formatAmount(txn.amount)}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(txn.txn_date, locale)}
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
                            prev?.map((tx) => (tx.id === txn.id ? { ...tx, receipt_path: path } : tx)) ?? null
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
            {t('categories.addTransaction')}
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

      <div>
        <h3 className="text-sm font-semibold mb-2">{t('categories.scheduledPayments')}</h3>
        {scheduled === null ? (
          <p className="text-xs text-slate-500">{t('common.loading')}</p>
        ) : scheduled.length === 0 ? (
          <p className="text-xs text-slate-500">{t('categories.noScheduledYet')}</p>
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
                      <p className="font-medium">₹{formatAmount(sp.expected_amount)}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(sp.due_date, locale)}
                        {payer && <> · {payer}</>}
                      </p>
                      {sp.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{sp.note}</p>}
                      {sp.status === 'paid' && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">{t('categories.paidLabel')}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {sp.status === 'pending' && (
                        <button
                          onClick={() => setMarkPaidFor(sp)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                        >
                          {t('categories.markPaidShort')}
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
            {t('categories.addScheduled')}
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
