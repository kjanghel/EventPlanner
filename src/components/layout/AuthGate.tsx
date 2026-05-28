import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

/**
 * Wraps routes that require a signed-in user with a captured phone number.
 * - Not signed in → redirect to /
 * - Signed in but no phone → redirect to /profile/phone
 * - Otherwise → render children
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  if (!profile?.phone_e164) return <Navigate to="/profile/phone" replace />
  return <>{children}</>
}
