import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const E164 = /^\+\d{8,15}$/

export function PhoneCapture() {
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
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, phone_e164: phone })
      .eq('id', user.id)
    setBusy(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    await refreshProfile()
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
