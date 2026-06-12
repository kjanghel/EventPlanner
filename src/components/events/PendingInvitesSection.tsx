import { useEffect, useState } from 'react'
import { Mail, Check, X } from 'lucide-react'
import {
  acceptPendingInvite,
  declinePendingInvite,
  listMyPendingInvites,
  type PendingInviteForMe,
} from '../../lib/queries'
import { useT } from '../../lib/i18n'

interface Props {
  // Called after at least one invite is accepted so the parent can
  // refresh its events list (the newly-joined event needs to appear).
  onAccepted: () => void
}

// Banner shown to existing users who have pending invites waiting. New
// users get auto-joined via the auth trigger and never see this banner.
// Tapping Review expands inline so each invite can be accepted or
// declined individually.
export function PendingInvitesSection({ onAccepted }: Props) {
  const t = useT()
  const [invites, setInvites] = useState<PendingInviteForMe[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMyPendingInvites()
      .then((list) => {
        if (!cancelled) setInvites(list)
      })
      .catch(() => {
        if (!cancelled) setInvites([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!invites || invites.length === 0) return null

  const handleAccept = async (id: string) => {
    setError(null)
    setBusyId(id)
    try {
      await acceptPendingInvite(id)
      setInvites((prev) => prev?.filter((i) => i.invite_id !== id) ?? null)
      onAccepted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pendingInvites.couldNotAccept'))
    } finally {
      setBusyId(null)
    }
  }

  const handleDecline = async (id: string) => {
    setError(null)
    setBusyId(id)
    try {
      await declinePendingInvite(id)
      setInvites((prev) => prev?.filter((i) => i.invite_id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pendingInvites.couldNotDecline'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
            <Mail className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-900 leading-snug">
              {t('pendingInvites.title', { count: invites.length })}
            </p>
            <p className="text-[11px] text-amber-800/80 leading-snug">
              {t('pendingInvites.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-xs font-medium text-amber-700 px-3 py-1.5 rounded-lg border border-amber-300 bg-white [touch-action:manipulation]"
          >
            {expanded ? t('common.dismiss') : t('pendingInvites.review')}
          </button>
        </div>

        {expanded && (
          <ul className="mt-3 pt-3 border-t border-amber-200 space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.invite_id}
                className="bg-white rounded-lg border border-amber-200 p-3"
              >
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {inv.event_name ?? t('pendingInvites.unknownEvent')}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {t('pendingInvites.invitedBy', {
                    who: inv.inviter_name || inv.inviter_email || t('pendingInvites.someone'),
                  })}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(inv.invite_id)}
                    disabled={busyId === inv.invite_id}
                    className="flex-1 flex items-center justify-center gap-1 bg-teal-600 text-white text-xs font-medium rounded-lg py-1.5 px-3 disabled:opacity-50 [touch-action:manipulation]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('pendingInvites.accept')}
                  </button>
                  <button
                    onClick={() => handleDecline(inv.invite_id)}
                    disabled={busyId === inv.invite_id}
                    className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg py-1.5 px-3 disabled:opacity-50 [touch-action:manipulation]"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('pendingInvites.decline')}
                  </button>
                </div>
              </li>
            ))}
            {error && (
              <li className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</li>
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
