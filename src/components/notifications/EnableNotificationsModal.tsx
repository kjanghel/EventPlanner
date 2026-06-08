import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import {
  canUseWebPush,
  hasVapidConfigured,
  requestPermissionAndSubscribe,
} from '../../lib/notifications'
import { useT } from '../../lib/i18n'

interface Props {
  onClose: () => void
  // 'dismiss' marks the user as "skip for now" (session-only).
  // 'never' marks "don't show me again" (persistent).
  onDismiss: (mode: 'dismiss' | 'never') => void
}

export function EnableNotificationsModal({ onClose, onDismiss }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnable = async () => {
    setError(null)
    setBusy(true)
    const result = await requestPermissionAndSubscribe()
    setBusy(false)
    if (result.ok) {
      onClose()
      return
    }
    switch (result.reason) {
      case 'unsupported':
        setError(t('notifications.errorUnsupported'))
        break
      case 'no-vapid':
        setError(t('notifications.errorNoVapid'))
        break
      case 'permission-denied':
        setError(t('notifications.errorPermissionDenied'))
        break
      case 'no-user':
        setError(t('notifications.errorNoUser'))
        break
      case 'subscribe-failed':
      case 'persist-failed':
      default:
        setError(t('notifications.errorGeneric'))
        break
    }
  }

  if (!canUseWebPush() || !hasVapidConfigured()) {
    // Should not be rendered in this case, but defend regardless so we
    // don't trap the user behind a useless dialog.
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800">
              {t('notifications.modal.title')}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              {t('notifications.modal.body')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-700 [touch-action:manipulation]"
            aria-label={t('common.dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="mx-5 mb-2 text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
        )}

        <div className="px-5 pb-5 pt-2 space-y-2">
          <button
            onClick={handleEnable}
            disabled={busy}
            className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50 [touch-action:manipulation]"
          >
            {busy ? t('notifications.modal.enabling') : t('notifications.modal.enable')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onDismiss('dismiss')}
              className="flex-1 text-xs text-slate-600 py-2 [touch-action:manipulation]"
            >
              {t('notifications.modal.skipForNow')}
            </button>
            <button
              onClick={() => onDismiss('never')}
              className="flex-1 text-xs text-slate-500 py-2 [touch-action:manipulation]"
            >
              {t('notifications.modal.notNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
