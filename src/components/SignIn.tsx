import { useState } from 'react'
import { useAuth } from '../lib/auth'

export function SignIn() {
  const { signInWithGoogle, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError(null)
    setBusy(true)
    try {
      await signInWithEmail(email)
      setLinkSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-center mb-1">Event Planner</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Sign in to manage your event budget.</p>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs text-slate-400"><span className="bg-white px-2">or</span></div>
        </div>

        {linkSent ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 text-center">
            Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={handleEmail} className="space-y-2">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full bg-slate-100 text-slate-900 rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50"
            >
              Email me a sign-in link
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>
        )}
      </div>
    </div>
  )
}
