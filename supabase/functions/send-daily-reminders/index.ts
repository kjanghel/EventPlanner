// Supabase Edge Function: send-daily-reminders
//
// Invoked hourly by pg_cron. Sends a Web Push notification to every device
// in push_subscriptions ONLY when the trigger fires in the 8 pm IST hour
// (= 14:30 UTC). The cron schedule keeps the function lightweight on every
// hour but only one of the 24 calls per day actually fans out pushes.
//
// Why hourly instead of "cron at 14:30 UTC" directly? pg_cron can do the
// exact-minute schedule fine, but keeping the function gated on its own
// clock check (a) makes it trivial to skip/test in the future and (b) makes
// the schedule "drift-safe" if Supabase shifts cron tick offsets.
//
// Setup (one-time):
//   supabase secrets set VAPID_PUBLIC_KEY=...      # from `npx web-push generate-vapid-keys`
//   supabase secrets set VAPID_PRIVATE_KEY=...
//   supabase secrets set VAPID_SUBJECT=mailto:you@example.com
//   supabase functions deploy send-daily-reminders --no-verify-jwt
//
// Cron — see supabase/functions/send-daily-reminders/SETUP.md for the
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

// 8 pm India Standard Time = 14:30 UTC. We compare the UTC hour so the
// hourly cron pings everyone once a day at that hour.
const REMINDER_UTC_HOUR = 14

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

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

  const now = new Date()
  if (now.getUTCHours() !== REMINDER_UTC_HOUR) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, hour_utc: now.getUTCHours() }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, locale')
  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  let sent = 0
  let failed = 0
  const removeIds: string[] = []

  await Promise.all(
    (subs ?? []).map(async (sub: any) => {
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
    JSON.stringify({ ok: true, sent, failed, pruned: removeIds.length }),
    { headers: { 'content-type': 'application/json' } },
  )
})
