import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SignIn } from './components/SignIn'
import { PhoneCapture } from './components/PhoneCapture'
import { EventsList } from './components/events/EventsList'
import { NewEventSheet } from './components/events/NewEventSheet'
import { EventHome } from './components/events/EventHome'
import { PlaceholderTab } from './components/events/EventHome'
import { CategoriesList } from './components/categories/CategoriesList'
import { PeopleList } from './components/people/PeopleList'
import { AuthGate } from './components/layout/AuthGate'
import { useAuth } from './lib/auth'

function RootLayout() {
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
  return <Navigate to="/events" replace />
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  useEffect(() => {
    const redirect = sessionStorage.redirect
    if (redirect) {
      delete sessionStorage.redirect
      navigate(redirect, { replace: true })
    }
  }, [navigate])
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/EventPlanner">
      <RouteGuard>
        <Routes>
        <Route path="/" element={<RootLayout />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/profile/phone" element={<PhoneCapture />} />

        <Route
          path="/events"
          element={
            <AuthGate>
              <EventsList />
            </AuthGate>
          }
        />

        <Route
          path="/events/new"
          element={
            <AuthGate>
              <NewEventSheet />
            </AuthGate>
          }
        />

        <Route
          path="/events/:id"
          element={
            <AuthGate>
              <EventHome />
            </AuthGate>
          }
        >
          <Route path="summary" element={<PlaceholderTab name="Summary" />} />
          <Route path="budget" element={<CategoriesList />} />
          <Route path="upcoming" element={<PlaceholderTab name="Upcoming" />} />
          <Route path="people" element={<PeopleList />} />
          <Route index element={<Navigate to="summary" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteGuard>
    </BrowserRouter>
  )
}
