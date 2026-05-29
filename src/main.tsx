import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './lib/auth'
import { LocaleProvider } from './lib/i18n'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </AuthProvider>
  </StrictMode>,
)
