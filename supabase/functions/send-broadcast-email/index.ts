// Supabase Edge Function: send-broadcast-email
//
// Sends a one-off email to every user in auth.users via Resend. Used for
// announcements like "daily reminders are now live — open the app to
// enable them" that we want to reach users who haven't installed push
// notifications yet (which is everyone-not-already-pushing).
//
// Manually invoked — NOT on a cron schedule. You call it once with a
// subject + body in the request, it fans out, returns counts.
//
// Protected by CRON_SECRET so the public can't trigger broadcasts. Same
// secret as send-daily-reminders.
//
// Setup — see supabase/functions/send-broadcast-email/SETUP.md
//
// Request body:
//   {
//     "subject": "Daily reminders are live in Event Planner",
//     "html": "<p>Open the app and enable reminders in Settings.</p>",
//     "text": "Open the app and enable reminders in Settings.",
//     "preview_only": false   // optional: if true, returns recipient
//                              // count without sending
//   }
//
// Response:
//   { ok: true, total_users: 42, sent: 41, failed: 1 }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
// 'from' address must be on a domain you've verified in Resend, OR use
// 'onboarding@resend.dev' which works without verification for testing.
const FROM_ADDRESS = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') ?? 'Event Planner'

type BroadcastBody = {
  subject: string
  html?: string
  text?: string
  preview_only?: boolean
}

// Resend's send endpoint can take a batch of up to 100 messages per call.
// We chunk recipients into 100-sized groups to keep each request safe.
async function sendBatch(batch: { to: string; subject: string; html?: string; text?: string }[]) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      batch.map((b) => ({
        from: `${FROM_NAME} <${FROM_ADDRESS}>`,
        to: b.to,
        subject: b.subject,
        html: b.html,
        text: b.text,
      })),
    ),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Resend batch failed: ${res.status} ${errText.slice(0, 500)}`)
  }
  return await res.json()
}

Deno.serve(async (req: Request) => {
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
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'RESEND_API_KEY not set in secrets' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, reason: 'POST required' }),
      { status: 405, headers: { 'content-type': 'application/json' } },
    )
  }

  let body: BroadcastBody
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false, reason: 'invalid JSON body' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
  }
  if (!body.subject || (!body.html && !body.text)) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'subject + (html or text) required' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  // Fetch every user. listUsers paginates at 1000/page by default — fine
  // for free-tier projects with hundreds of users. For more, loop pages.
  const allEmails: string[] = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      return new Response(
        JSON.stringify({ ok: false, reason: `listUsers failed: ${error.message}` }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }
    for (const u of data.users) {
      if (u.email && u.email_confirmed_at) allEmails.push(u.email)
    }
    if (data.users.length < 1000) break
    page++
  }

  if (body.preview_only) {
    return new Response(
      JSON.stringify({ ok: true, preview: true, total_users: allEmails.length }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  // Chunk + send. Each chunk is one Resend batch call (max 100 per call
  // per Resend docs). Track per-batch success/failure rather than
  // per-email since the batch API doesn't return individual statuses
  // reliably for failures.
  let sent = 0
  let failed = 0
  const errors: string[] = []
  for (let i = 0; i < allEmails.length; i += 100) {
    const chunk = allEmails.slice(i, i + 100).map((to) => ({
      to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    }))
    try {
      await sendBatch(chunk)
      sent += chunk.length
    } catch (err: any) {
      failed += chunk.length
      errors.push(err?.message ?? String(err))
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      total_users: allEmails.length,
      sent,
      failed,
      errors: errors.slice(0, 5),
    }),
    { headers: { 'content-type': 'application/json' } },
  )
})
