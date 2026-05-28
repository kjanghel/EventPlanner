import { useAuth } from './lib/auth'
import { SignIn } from './components/SignIn'
import { PhoneCapture } from './components/PhoneCapture'
import { Home } from './components/Home'

export default function App() {
  const { loading, user, profile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (!user) return <SignIn />
  if (!profile?.phone_e164) return <PhoneCapture />
  return <Home />
}
