import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './lib/auth'
import { LocaleProvider } from './lib/i18n'
import { registerServiceWorker } from './lib/notifications'
import App from './App'
import './index.css'

// Register the Web Push service worker at boot — no-op on browsers that
// don't support it. Subscribing to push happens separately when the user
// opts in from the notifications modal / settings toggle.
void registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </AuthProvider>
  </StrictMode>,
)
