import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { updateMyProfile } from '../../lib/queries'

export function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setPhone(profile?.phone_e164 ?? '')
  }, [profile?.display_name, profile?.phone_e164])

  const email = user?.email ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await updateMyProfile({
        display_name: displayName,
        phone_e164: phone,
      })
      await refreshProfile()
      setInfo('Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500"
          >
            ← Back
          </button>
          <h1 className="text-base font-semibold tracking-tight">Profile</h1>
          <span className="w-12" />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 pt-4 max-w-md mx-auto w-full space-y-4">
        {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
        {info && <p className="text-xs text-green-800 bg-green-50 rounded-lg p-2">{info}</p>}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">Your details</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                value={email ?? ''}
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">From your sign-in account.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Karan"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-xs text-slate-400 mt-1">
                Shown to other members of events you share.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-xs text-slate-400 mt-1">
                Optional — shared with members so they can reach you.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 px-3 text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </form>
        </section>

        <Link
          to="/events"
          className="block text-center text-xs text-slate-500"
        >
          Back to events
        </Link>
      </main>
    </div>
  )
}
