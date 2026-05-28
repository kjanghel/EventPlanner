import { useAuth } from '../lib/auth'

export function Home() {
  const { profile, user, signOut } = useAuth()
  const name = profile?.display_name ?? user?.email ?? 'there'

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Event Planner</h1>
        <button
          onClick={() => { void signOut().catch((e) => console.error('signOut click failed:', e)) }}
          className="text-xs text-slate-500 underline"
        >Sign out</button>
      </header>
      <main className="flex-1 p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-1">Hello, {name} 👋</h2>
          <p className="text-sm text-slate-500 mb-4">
            Base setup complete. Features (events, expenses, plan, sharing) will land here next.
          </p>
          <dl className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between"><dt>Email</dt><dd className="font-mono">{user?.email}</dd></div>
            <div className="flex justify-between"><dt>Phone</dt><dd className="font-mono">{profile?.phone_e164}</dd></div>
          </dl>
        </div>
      </main>
    </div>
  )
}
