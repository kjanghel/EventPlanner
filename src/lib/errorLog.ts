import { supabase } from './supabase'

// Bumped manually when we ship a release worth distinguishing.
const APP_VERSION = '0.5.0'

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
