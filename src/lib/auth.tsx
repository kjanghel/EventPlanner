import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from './supabase'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[auth] loadProfile failed:', error)
      setProfile(null)
      return
    }
    setProfile((data as Profile | null) ?? null)
  }, [])

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires INITIAL_SESSION exactly once on subscribe —
    // use it as the single source of truth for both initial load and changes.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[auth] event:', event, 'hasSession:', !!newSession)
      if (!mounted) return
      setSession(newSession)
      try {
        if (newSession?.user) {
          await loadProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[auth] handler failed:', err)
      } finally {
        if (event === 'INITIAL_SESSION') setLoading(false)
      }
    })

    // Safety net: if INITIAL_SESSION never fires for some reason, unblock
    // the UI after 3 seconds.
    const t = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(t)
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id)
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) throw error
  }

  const signOut = async () => {
    console.log('[auth] signOut called')
    setSession(null)
    setProfile(null)
    try {
      // scope: 'local' clears localStorage immediately and skips the
      // server-side revoke call (which can hang). The access token simply
      // expires server-side on its own schedule.
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) console.error('[auth] signOut error:', error)
      else console.log('[auth] signOut OK')
    } catch (err) {
      console.error('[auth] signOut threw:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        refreshProfile,
        signInWithGoogle,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
