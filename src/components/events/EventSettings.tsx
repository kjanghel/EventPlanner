import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import {
  listEventMembers,
  listEventInvites,
  inviteByEmail,
  sendInviteEmail,
  cancelInvite,
  removeMember,
  deleteEvent,
  updateEvent,
  cloneEvent,
  getEvent,
  type EventMember,
  type EventInvite,
  type EventTotals,
} from '../../lib/queries'
import { useAuth } from '../../lib/auth'
import { useT } from '../../lib/i18n'

export function EventSettings() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const t = useT()
  const [event, setEvent] = useState<EventTotals | null>(null)
  const [members, setMembers] = useState<EventMember[] | null>(null)
  const [invites, setInvites] = useState<EventInvite[] | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)

  useEffect(() => {
    if (!eventId) return
    setError(null)
    Promise.all([
      getEvent(eventId).then(setEvent),
      listEventMembers(eventId).then(setMembers),
      listEventInvites(eventId).then(setInvites),
    ]).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId])

  const myRow = members?.find((m) => m.user_id === user?.id)
  const isOwner = myRow?.role === 'owner'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setError(t('eventSettings.inviteEmailInvalid'))
      return
    }
    if (invites?.some((i) => i.invited_email.toLowerCase() === trimmed)) {
      setError(t('eventSettings.invitePending'))
      return
    }
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const inv = await inviteByEmail(eventId, trimmed)
      setInvites((prev) => [...(prev ?? []), inv])
      setEmail('')
      try {
        await sendInviteEmail(trimmed)
        setInfo(t('eventSettings.invited', { email: inv.invited_email }))
      } catch (emailErr) {
        setInfo(
          t('eventSettings.invitedNoEmail', {
            email: inv.invited_email,
            reason: emailErr instanceof Error ? emailErr.message : 'unknown',
          }),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotInvite'))
    } finally {
      setBusy(false)
    }
  }

  const handleCopyInvite = async (inv: EventInvite) => {
    const name = event?.name ?? t('events.event')
    const url = `${window.location.origin}/EventPlanner/`
    const text = t('eventSettings.inviteCopyBody', {
      name,
      email: inv.invited_email,
      url,
    })
    try {
      await navigator.clipboard.writeText(text)
      setInfo(t('eventSettings.copiedInvite'))
    } catch {
      setError(text)
    }
  }

  const handleCancelInvite = async (id: string) => {
    if (!confirm(t('eventSettings.confirmCancelInvite'))) return
    try {
      await cancelInvite(id)
      setInvites((prev) => prev?.filter((i) => i.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotCancel'))
    }
  }

  const handleRemoveMember = async (memberUserId: string) => {
    if (!eventId) return
    if (!confirm(t('eventSettings.confirmRemoveMember'))) return
    try {
      await removeMember(eventId, memberUserId)
      setMembers((prev) => prev?.filter((m) => m.user_id !== memberUserId) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotRemove'))
    }
  }

  const handleLeave = async () => {
    if (!eventId || !user) return
    if (!confirm(t('eventSettings.confirmLeave'))) return
    try {
      await removeMember(eventId, user.id)
      navigate('/events', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotLeave'))
    }
  }

  const startEditEvent = () => {
    if (!event) return
    setEventName(event.name)
    setEventDate(event.event_date ?? '')
    setEditingEvent(true)
  }

  const saveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !eventName.trim()) return
    setError(null)
    setSavingEvent(true)
    try {
      await updateEvent(eventId, {
        name: eventName,
        event_date: eventDate || null,
      })
      const refreshed = await getEvent(eventId)
      setEvent(refreshed)
      setEditingEvent(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.saveFailed'))
    } finally {
      setSavingEvent(false)
    }
  }

  const handleDuplicate = async () => {
    if (!eventId || !event) return
    const suggested = t('eventSettings.duplicateSuffix', { name: event.name })
    const newName = prompt(t('eventSettings.duplicatePrompt'), suggested)
    if (newName === null) return
    const trimmed = newName.trim()
    if (!trimmed) {
      setError(t('eventSettings.nameEmpty'))
      return
    }
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const newId = await cloneEvent(eventId, trimmed)
      navigate(`/events/${newId}/summary`, { replace: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotDuplicate'))
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!eventId) return
    const name = event?.name ?? t('eventSettings.deleteFallbackName')
    if (!confirm(t('eventSettings.confirmDelete', { name }))) return
    try {
      await deleteEvent(eventId)
      navigate('/events', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eventSettings.couldNotDelete'))
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={`/events/${eventId}/summary`} className="text-sm text-slate-500">
            ← {t('common.back')}
          </Link>
          <h1 className="text-base font-semibold tracking-tight truncate max-w-[60%]">
            {event?.name ?? t('eventSettings.settingsFallback')}
          </h1>
          <span className="w-12" />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 pt-4 max-w-md mx-auto w-full space-y-4">
        {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
        {info && <p className="text-xs text-green-800 bg-green-50 rounded-lg p-2">{info}</p>}

        {isOwner && event && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{t('eventSettings.eventDetails')}</h2>
              {!editingEvent && (
                <button
                  onClick={startEditEvent}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={t('eventSettings.editEvent')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {!editingEvent ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-xs text-slate-400">{t('eventSettings.name')}</dt>
                  <dd className="font-medium truncate">{event.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs text-slate-400">{t('eventSettings.eventDate')}</dt>
                  <dd className="font-mono text-xs">{event.event_date ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={saveEditEvent} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('eventSettings.name')}</label>
                  <input
                    autoFocus
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('eventSettings.eventDate')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingEvent || !eventName.trim()}
                    className="flex-1 bg-teal-600 text-white rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
                  >
                    {savingEvent ? t('common.saving') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(false)}
                    className="flex-1 bg-slate-100 text-slate-900 rounded-lg py-2 px-3 text-sm font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">{t('eventSettings.members')}</h2>
          {members === null ? (
            <p className="text-xs text-slate-500">{t('common.loading')}</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-slate-500">{t('eventSettings.noMembers')}</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {m.display_name ?? m.email ?? t('eventSettings.unnamed')}
                      {m.user_id === user?.id && (
                        <span className="ml-1 text-xs text-slate-400">{t('eventSettings.you')}</span>
                      )}
                    </p>
                    {m.email && m.display_name && (
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    )}
                    <p className="text-xs text-slate-400">{m.role}</p>
                  </div>
                  {isOwner && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-xs text-red-600 hover:text-red-700 ml-2"
                    >
                      {t('eventSettings.remove')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isOwner && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold mb-3">{t('eventSettings.pendingInvites')}</h2>
            {invites === null ? (
              <p className="text-xs text-slate-500">{t('common.loading')}</p>
            ) : invites.length === 0 ? (
              <p className="text-xs text-slate-500">{t('eventSettings.noPendingInvites')}</p>
            ) : (
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{inv.invited_email}</p>
                      <p className="text-xs text-slate-500">{t('eventSettings.pendingLabel')}</p>
                    </div>
                    <button
                      onClick={() => handleCopyInvite(inv)}
                      className="text-xs text-teal-700 hover:text-teal-800"
                    >
                      {t('eventSettings.copyLink')}
                    </button>
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      {t('common.cancel')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isOwner && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold mb-3">{t('eventSettings.inviteByEmail')}</h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <input
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('eventSettings.invitePlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-slate-500 mt-1">{t('eventSettings.inviteHint')}</p>
              </div>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-3 text-sm font-medium disabled:opacity-50"
              >
                {busy ? t('eventSettings.inviting') : t('eventSettings.sendInvite')}
              </button>
            </form>
          </section>
        )}

        {myRow && event && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold mb-1">{t('eventSettings.duplicate')}</h2>
            <p className="text-xs text-slate-500 mb-3">{t('eventSettings.duplicateDesc')}</p>
            <button
              onClick={handleDuplicate}
              disabled={busy}
              className="w-full bg-slate-100 text-slate-900 rounded-lg py-2 px-3 text-sm font-medium disabled:opacity-50"
            >
              {busy ? t('eventSettings.duplicating') : t('eventSettings.duplicateThis')}
            </button>
          </section>
        )}

        {!isOwner && myRow && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <button
              onClick={handleLeave}
              className="w-full text-sm text-red-600 font-medium py-2"
            >
              {t('eventSettings.leaveEvent')}
            </button>
          </section>
        )}

        {isOwner && (
          <section className="bg-white rounded-2xl border border-red-200 p-4">
            <h2 className="text-sm font-semibold text-red-700 mb-1">{t('common.dangerZone')}</h2>
            <p className="text-xs text-slate-500 mb-3">{t('eventSettings.dangerDesc')}</p>
            <button
              onClick={handleDeleteEvent}
              className="w-full bg-red-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-red-700"
            >
              {t('eventSettings.deleteEvent')}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
