// Supabase Edge Function: send-test-notification
//
// Validates the end-to-end push pipeline from inside the app:
//   user taps "Send test notification" → this function looks up their own
//   push_subscriptions rows → fires a one-off web-push to each → user sees
//   it on their lock screen within seconds.
//
// Deployed WITH JWT verification (the default) — the caller's Authorization
// header (Supabase access token) identifies the user via supabase.auth.
// No CRON_SECRET needed because this isn't a cron entrypoint.
//
// Setup:
//   Dashboard → Edge Functions → Create function "send-test-notification"
//   Leave "Verify JWT" ON (default)
//   Paste this file's contents, Deploy.
//
// The same VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT secrets
// you already set for send-daily-reminders are reused here.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'VAPID keys not set in secrets' }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    )
  }

  // Identify the calling user from the Authorization header. With JWT
  // verification ON, the function won't even reach here without a valid
  // token, but we still need to know which user it is.
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'no auth token' }),
      { status: 401, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    )
  }

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'invalid token' }),
      { status: 401, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    )
  }
  const userId = userData.user.id

  // Pull THIS user's subscriptions only.
  const { data: subs, error } = await userClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, locale')
    .eq('user_id', userId)
  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    )
  }
  if (!subs || subs.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'no subscriptions for this user' }),
      { status: 404, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
    )
  }

  const isHindi = subs[0]?.locale === 'hi'
  const payload = isHindi
    ? {
        title: 'टेस्ट नोटिफिकेशन',
        body: 'सब कुछ ठीक से काम कर रहा है। शाम 8 बजे रोज़ का रिमाइंडर इसी तरह दिखेगा।',
      }
    : {
        title: 'Test notification',
        body: "It's working! This is exactly how your 8 pm reminder will look.",
      }

  let sent = 0
  let failed = 0
  const removeIds: string[] = []

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: '/EventPlanner/',
            tag: 'eventplanner-test',
          }),
        )
        sent++
      } catch (err: any) {
        failed++
        const code = err?.statusCode ?? 0
        if (code === 404 || code === 410) removeIds.push(sub.id)
      }
    }),
  )

  if (removeIds.length > 0) {
    await userClient.from('push_subscriptions').delete().in('id', removeIds)
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, pruned: removeIds.length }),
    { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } },
  )
})
