import { supabase } from './supabase'

// Bumped manually when we ship a release worth distinguishing.
const APP_VERSION = '0.6.0'

type Metadata = Record<string, unknown>

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function extractStack(err: unknown): string | undefined {
  if (err instanceof Error && err.stack) return err.stack
  return undefined
}

// Best-effort error logger. Always resolves — never throws, never blocks the
// caller. The point is to capture diagnostics for users in the field; if the
// log insert itself fails we don't want to drown the original error.
export async function logError(
  context: string,
  err: unknown,
  metadata?: Metadata,
  eventId?: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      user_id: user?.id ?? null,
      event_id: eventId ?? null,
      context,
      message: extractMessage(err).slice(0, 2000),
      stack: extractStack(err)?.slice(0, 4000) ?? null,
      metadata: metadata ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      app_version: APP_VERSION,
    }

    await supabase.from('errors_log').insert(payload)
  } catch {
    // Swallow — logging errors must never produce more errors.
  }
}

// Install browser-level error capture. Catches uncaught JS errors and
// unhandled promise rejections from anywhere in the app, including
// places we didn't explicitly wrap with try/catch. Call once at boot
// from main.tsx. Safe to call more than once — listeners are tagged so
// duplicates no-op.
let _globalHandlersInstalled = false
export function installGlobalErrorCapture(): void {
  if (typeof window === 'undefined' || _globalHandlersInstalled) return
  _globalHandlersInstalled = true

  window.addEventListener('error', (e) => {
    void logError('window.error', e.error ?? e.message, {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    void logError('unhandledrejection', e.reason, {
      // e.reason can be anything — capture its shape for debugging.
      reasonType: typeof e.reason,
    })
  })
}

// Log a manually-reported issue from the user via the Settings feedback
// form. Same table as crash reports — just tagged with context
// 'user_feedback' so you can filter for them. The message is whatever
// the user typed; metadata auto-captures their current URL + locale +
// network state so you don't have to ask follow-up questions.
export async function sendUserFeedback(
  text: string,
  eventId?: string,
): Promise<void> {
  await logError(
    'user_feedback',
    text || '(no message)',
    {
      url: typeof window !== 'undefined' ? window.location.href : null,
      locale:
        typeof navigator !== 'undefined' ? navigator.language : null,
      online:
        typeof navigator !== 'undefined' ? navigator.onLine : null,
      sw_supported:
        typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      screen:
        typeof window !== 'undefined'
          ? `${window.innerWidth}x${window.innerHeight}`
          : null,
    },
    eventId,
  )
}
