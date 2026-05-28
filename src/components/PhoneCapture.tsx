import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const E164 = /^\+\d{8,15}$/

export function PhoneCapture() {
  const navigate = useNavigate()
  const { user, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? '',
  )
  const [phone, setPhone] = useState('+91')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!E164.test(phone)) {
      setError('Phone must be in E.164 format, e.g. +919876543210')
      return
    }
    if (!user) return
    setBusy(true)
    console.log('[PhoneCapture] Saving phone:', phone, 'user:', user.id)
    try {
      console.log('[PhoneCapture] About to upsert profile...')
      const { error: upErr, data } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            display_name: displayName.trim() || null,
            phone_e164: phone,
          },
          { onConflict: 'id' }
        )
        .select()
      console.log('[PhoneCapture] Upsert returned:', { error: upErr, data })
      if (upErr) {
        setError(upErr.message)
        setBusy(false)
        return
      }
      console.log('[PhoneCapture] Upsert successful, calling refreshProfile')
      await refreshProfile()
      console.log('[PhoneCapture] refreshProfile done, navigating to /')
      // Navigate to / — RootLayout will see the updated profile and redirect to /events
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[PhoneCapture] Error:', err)
      setError(err instanceof Error ? err.message : 'Save failed')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-semibold mb-1">Almost there</h1>
        <p className="text-sm text-slate-500 mb-5">
          Tell us your name and phone number. The phone is only used so others can invite you to their events — it is not used for login.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Your name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Vivek"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone (E.164 format)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              inputMode="tel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

        <button
          onClick={() => { void signOut().catch((e) => console.error('signOut click failed:', e)) }}
          className="mt-4 w-full text-xs text-slate-500 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
