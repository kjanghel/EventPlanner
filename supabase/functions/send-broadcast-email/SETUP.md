# Email Broadcast — Setup & First Send

A one-off email blast to every confirmed user via Resend. Use it when you
want to reach users who haven't opened the app recently — including ones
who haven't enabled push notifications.

Setup is one-time (~10 min). Each subsequent broadcast is just one SQL/curl
command with the subject + body.

## 1. Create a Resend account

[https://resend.com](https://resend.com) → sign up (free tier: 100 emails/day, no credit card).

## 2. Get your API key

Resend dashboard → API Keys → Create API Key → name it `EventPlanner` →
copy the key (starts with `re_`). You won't see it again, so save it.

## 3. Decide on a "from" address

Two options:

**Easiest (no domain needed):** Use Resend's onboarding address
`onboarding@resend.dev`. Works immediately, but emails may look slightly
less trustworthy to recipients (the domain is `resend.dev`).

**Better (your own domain):** Resend → Domains → Add Domain → enter your
domain → follow the DNS verification steps (3 records to add). Once
verified, you can send from `hello@yourdomain.com` or whatever address
you like.

For your first broadcast, the onboarding domain is fine. Switch to a
verified domain later.

## 4. Set Supabase Edge Function secrets

Dashboard → Project Settings → Edge Functions → Secrets → add:

- `RESEND_API_KEY` — the key from step 2 (starts with `re_`)
- `RESEND_FROM` — `onboarding@resend.dev` (or your verified email)
- `RESEND_FROM_NAME` — `Event Planner` (display name shown in inbox)

`CRON_SECRET` is reused from `send-daily-reminders` (no new secret needed).

## 5. Deploy the function

Dashboard → Edge Functions → **Create a new function**:
- Name: `send-broadcast-email`
- Verify JWT: **OFF** (we use CRON_SECRET instead, same as the cron one)
- Paste contents of [index.ts](./index.ts)
- Deploy

## Important: Resend's onboarding-domain restriction

If you're using `RESEND_FROM=onboarding@resend.dev` (no domain verified),
Resend will reject any recipient that isn't the **account-owner's email
address**. This is a Resend safety feature against spam abuse, not a bug
in this function. You'll see errors like:

```
"Invalid `to` field. Please use our testing email address instead of
domains like `example.com`."
```

You have two ways forward:

**Option A — Test with your own email only (no domain setup needed)**

Use the `test_to` parameter to bypass the user sweep and send to a single
address. Since that address is your Resend account email, the onboarding
domain will deliver fine. See "Test send to one address" below.

**Option B — Verify a domain in Resend (proper fix)**

Resend → Domains → Add Domain → enter a domain you own → add the DNS
records they show you → wait ~5 min for verification. Then change
`RESEND_FROM` in your Supabase secrets to e.g. `hello@yourdomain.com`.

## Test send to one address

Send to just one email (yours) without touching `auth.users`. Useful for
previewing the rendered email AND for working around the onboarding-domain
restriction.

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-broadcast-email" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'EOF'
{
  "subject": "Daily reminders are now live",
  "html": "<p>Test render — open the app and enable reminders in Settings.</p>",
  "text": "Test render — open the app and enable reminders in Settings.",
  "test_to": "your-email@example.com"
}
EOF
```

`test_to` also accepts an array if you want to send to a small set of
addresses, e.g. `"test_to": ["you@example.com", "spouse@example.com"]`.

When `test_to` is present, the function skips the auth.users query
entirely and sends only to the listed addresses.

## 6. Dry-run preview (recommended before first send)

Counts your audience without sending. Replace `<cron-secret>` with your
CRON_SECRET value.

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-broadcast-email" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "preview",
    "text": "preview",
    "preview_only": true
  }'
```

Response: `{"ok":true,"preview":true,"total_users":N}` — confirms how many
users would receive the email.

## 7. Send the real broadcast

Pre-drafted content for the "daily reminders are now live" announcement,
both English and Hindi. Pick one (or send both, see step 8).

### English version

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-broadcast-email" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'EOF'
{
  "subject": "Daily reminders are now live in Event Planner",
  "html": "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;\"><h2 style=\"color: #0d9488; margin-top: 0;\">Never forget to log a spend again</h2><p>Hi! Quick heads-up — we just shipped daily reminders in Event Planner.</p><p>At your chosen time each evening, your phone will get a friendly nudge to log any expenses from that day. No more end-of-week guesswork.</p><p><strong>To turn it on:</strong></p><ol><li>Open <a href=\"https://kjanghel.github.io/EventPlanner/\" style=\"color: #0d9488;\">Event Planner</a></li><li>Tap the menu icon → Settings → Notifications</li><li>Tap \"Enable reminders\", grant the browser permission</li><li>Optionally pick your preferred reminder time</li></ol><p style=\"color: #6b7280; font-size: 14px;\">On iPhone? Install Event Planner from Safari's Share menu first (\"Add to Home Screen\") — push notifications only work for installed apps on iOS.</p><p>That's it. Two minutes today, an hour of guesswork saved every week.</p><p style=\"color: #6b7280; font-size: 12px; margin-top: 32px;\">— The Event Planner team</p></div>",
  "text": "Hi! Daily reminders are now live in Event Planner. At your chosen time each evening, your phone gets a friendly nudge to log spends. To turn it on: open https://kjanghel.github.io/EventPlanner/ → menu → Settings → Notifications → Enable reminders. On iPhone, install from Safari's Share menu first."
}
EOF
```

### Hindi version

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-broadcast-email" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'EOF'
{
  "subject": "Event Planner में रोज़ का रिमाइंडर अब उपलब्ध है",
  "html": "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;\"><h2 style=\"color: #0d9488; margin-top: 0;\">अब कोई खर्च दर्ज करना नहीं भूलेंगे</h2><p>नमस्ते! एक छोटी सी अपडेट — हमने Event Planner में रोज़ का रिमाइंडर चालू कर दिया है।</p><p>आपके चुने हुए समय पर हर शाम आपके फ़ोन पर एक हल्का सा नोटिफिकेशन आएगा — आज के खर्चे दर्ज करने के लिए। हफ़्ते के अंत में अनुमान लगाने की ज़रूरत नहीं।</p><p><strong>चालू करने के लिए:</strong></p><ol><li><a href=\"https://kjanghel.github.io/EventPlanner/\" style=\"color: #0d9488;\">Event Planner</a> खोलें</li><li>मेनू → Settings → Notifications पर जाएँ</li><li>\"Enable reminders\" दबाएँ, ब्राउज़र की अनुमति दें</li><li>अपना पसंदीदा समय चुनें</li></ol><p style=\"color: #6b7280; font-size: 14px;\">iPhone पर हैं? पहले Safari के Share मेनू से Event Planner इंस्टॉल करें (\"Add to Home Screen\") — iOS पर पुश नोटिफिकेशन केवल इंस्टॉल किए हुए ऐप्स में काम करता है।</p><p>बस इतना ही। आज के दो मिनट, हर हफ़्ते एक घंटे की मेहनत बचाएँगे।</p><p style=\"color: #6b7280; font-size: 12px; margin-top: 32px;\">— Event Planner टीम</p></div>",
  "text": "नमस्ते! Event Planner में रोज़ का रिमाइंडर अब उपलब्ध है। चालू करने के लिए: https://kjanghel.github.io/EventPlanner/ खोलें → मेनू → Settings → Notifications → Enable reminders। iPhone पर पहले Safari के Share मेनू से इंस्टॉल करें।"
}
EOF
```

## 8. Per-locale targeting (optional v2 enhancement)

Right now the function sends the same content to every user regardless of
their `locale` preference. If you want to send English to English users
and Hindi to Hindi users, that's a future change — add a `locale` filter
to the function and call it twice (once per locale).

## Troubleshooting

- **`forbidden`** — your CRON_SECRET header is missing or wrong.
- **`RESEND_API_KEY not set`** — secret missing in Edge Function settings.
- **`Resend batch failed: 422`** — your `from` address isn't valid. Either
  use `onboarding@resend.dev` or finish DNS verification for your domain.
- **`Resend batch failed: 429`** — you've hit the 100/day free-tier limit.
  Wait 24h or upgrade Resend.
- **`total_users` smaller than expected** — only confirmed users (those
  who clicked the magic link / verified email) are counted. Unconfirmed
  signups are skipped.
