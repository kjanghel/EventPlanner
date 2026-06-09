// Supabase Edge Function: send-daily-reminders
//
// Invoked hourly by pg_cron. Each invocation pulls every push_subscription
// joined with its owner's profile (reminder_hour + reminder_tz) and sends
// a notification only to users whose CURRENT local hour matches their
// reminder_hour. So a user with reminder_hour=20 / reminder_tz='Asia/Kolkata'
// gets a push during the UTC tick where 14:00 UTC = 19:30 IST → falls into
// the 20 local-hour bucket on the next tick at 15:00 UTC = 20:30 IST. We
// floor to the local hour so the 20:00–20:59 window all hits one push.
//
// Setup — see supabase/functions/send-daily-reminders/SETUP.md for the
// exact SQL to run in the Supabase dashboard.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@example.com'
// Shared secret between this function and the pg_cron job that calls it.
// Without it (or with the wrong value) we reject the request — so a public
// caller can't spam pushes by hammering the endpoint.
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

// Compute the local hour (0–23) right now in a given IANA timezone.
// Uses Intl.DateTimeFormat with hour-only formatting which Deno supports
// out of the box.
function localHourIn(tz: string, now: Date): number | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    })
    const hourStr = fmt.format(now)
    // 'en-US' with hour12=false returns "0" through "23". A few locales
    // return "24" at midnight — normalise to 0.
    const h = parseInt(hourStr, 10)
    if (!Number.isFinite(h)) return null
    return h === 24 ? 0 : h
  } catch {
    return null
  }
}

// English and Hindi message pools — picked at random per recipient based on
// their stored locale. Add more freely; the more variety the less the
// reminders feel like a nag.
const MESSAGES: Record<string, { title: string; body: string }[]> = {
  en: [
    { title: 'Quick check-in', body: 'Did you spend something today? Log it before it slips your mind.' },
    { title: 'Daily reminder', body: 'Two minutes now saves an hour of guesswork later — log today’s spends.' },
    { title: 'Event Planner', body: 'Any payments or cash today? Pop in and add them so the budget stays real.' },
    { title: 'Spends update?', body: 'Bills, vendors, tips — add today’s expenses so nothing slips through.' },
    { title: 'Your future self thanks you', body: 'Keep the planner current — add anything from today before bed.' },
  ],
  hi: [
    { title: 'जल्दी चेक-इन', body: 'आज कोई खर्च हुआ? भूलने से पहले दर्ज कर दें।' },
    { title: 'रोज़ का रिमाइंडर', body: 'अभी दो मिनट लगाएँ, बाद में घंटों का हिसाब बच जाएगा।' },
    { title: 'Event Planner', body: 'आज कोई भुगतान हुआ? ऐप में जोड़ें ताकि बजट सही रहे।' },
    { title: 'खर्चे अपडेट करें', body: 'बिल, वेंडर, टिप — आज के सारे खर्च दर्ज कर दें।' },
    { title: 'भविष्य का आप शुक्रिया कहेगा', body: 'सोने से पहले आज की एंट्री जोड़ दें।' },
  ],
}

function pickMessage(locale: string | null | undefined): { title: string; body: string } {
  const pool = MESSAGES[locale === 'hi' ? 'hi' : 'en']!
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]!
}

Deno.serve(async (req: Request) => {
  // Fail closed: if the cron secret isn't set on the function we reject
  // EVERY call, including legitimate cron. Better to be loudly broken
  // than silently public.
  if (!CRON_SECRET) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'CRON_SECRET not set in secrets' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
  if (req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'forbidden' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'VAPID keys not set in secrets' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  // Optional body params for manual testing:
  //   { "force": true }                    → bypass local-hour check, send to all
  //   { "force": true, "only_user_id": ".." } → same, but limit to one user
  // Body is ignored when the request isn't POST or has no JSON.
  let force = false
  let onlyUserId: string | null = null
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (body && typeof body === 'object') {
        force = body.force === true
        if (typeof body.only_user_id === 'string') onlyUserId = body.only_user_id
      }
    } catch {
      /* ignore — body is optional */
    }
  }

  const now = new Date()

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  // Pull subs and the matching profiles in two queries, then merge in code.
  // push_subscriptions.user_id and profiles.id both reference auth.users(id)
  // but PostgREST can't infer that as a single-step join, so do it ourselves.
  let subsQuery = supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, locale')
  if (onlyUserId) subsQuery = subsQuery.eq('user_id', onlyUserId)
  const { data: subs, error } = await subsQuery
  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)))
  const profilesById = new Map<string, { reminder_hour: number; reminder_tz: string }>()
  if (userIds.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, reminder_hour, reminder_tz')
      .in('id', userIds)
    if (pErr) {
      return new Response(
        JSON.stringify({ ok: false, error: pErr.message }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }
    for (const p of profs ?? []) {
      profilesById.set((p as any).id, {
        reminder_hour: (p as any).reminder_hour,
        reminder_tz: (p as any).reminder_tz,
      })
    }
  }

  let sent = 0
  let failed = 0
  let skipped = 0
  const removeIds: string[] = []

  await Promise.all(
    (subs ?? []).map(async (sub: any) => {
      const prof = profilesById.get(sub.user_id)
      const targetHour = prof?.reminder_hour
      const tz: string = prof?.reminder_tz ?? 'Asia/Kolkata'
      if (!force) {
        if (targetHour === undefined || targetHour === null) {
          skipped++
          return
        }
        const localHour = localHourIn(tz, now)
        if (localHour === null || localHour !== targetHour) {
          skipped++
          return
        }
      }
      const msg = pickMessage(sub.locale)
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: msg.title,
            body: msg.body,
            url: '/EventPlanner/',
            tag: 'eventplanner-daily',
          }),
        )
        sent++
      } catch (err: any) {
        failed++
        // 410 Gone / 404 Not Found mean the subscription is dead — drop it
        // so we don't keep trying. Other errors are transient.
        const code = err?.statusCode ?? 0
        if (code === 404 || code === 410) removeIds.push(sub.id)
      }
    }),
  )

  if (removeIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', removeIds)
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sent,
      failed,
      skipped,
      pruned: removeIds.length,
      total: subs?.length ?? 0,
      force,
      only_user_id: onlyUserId,
      utc_now: now.toISOString(),
    }),
    { headers: { 'content-type': 'application/json' } },
  )
})
