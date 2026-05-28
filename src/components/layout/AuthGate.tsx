import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

/**
 * Wraps routes that require a signed-in user.
 * - Not signed in → redirect to /
 * - Otherwise → render children
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  return <>{children}</>
}
