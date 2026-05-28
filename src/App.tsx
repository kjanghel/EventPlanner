import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn } from './components/SignIn'
import { EventsList } from './components/events/EventsList'
import { NewEventSheet } from './components/events/NewEventSheet'
import { EventHome } from './components/events/EventHome'
import { EventSettings } from './components/events/EventSettings'
import { EventSummary } from './components/events/EventSummary'
import { CategoriesList } from './components/categories/CategoriesList'
import { CategoryDetail } from './components/categories/CategoryDetail'
import { UpcomingList } from './components/upcoming/UpcomingList'
import { PeopleList } from './components/people/PeopleList'
import { AuthGate } from './components/layout/AuthGate'
import { useAuth } from './lib/auth'

function RootLayout() {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (!user) return <SignIn />
  return <Navigate to="/events" replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/EventPlanner">
      <Routes>
        <Route path="/" element={<RootLayout />} />
        <Route path="/signin" element={<SignIn />} />

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
          path="/events/:id/settings"
          element={
            <AuthGate>
              <EventSettings />
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
          <Route path="summary" element={<EventSummary />} />
          <Route path="budget/:catId" element={<CategoryDetail />} />
          <Route path="budget" element={<CategoriesList />} />
          <Route path="upcoming" element={<UpcomingList />} />
          <Route path="people" element={<PeopleList />} />
          <Route index element={<Navigate to="summary" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
