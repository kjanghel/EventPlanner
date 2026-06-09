# Daily Reminders — One-Time Setup

Two Edge Functions ship with this feature:
- **send-daily-reminders** — pg_cron fires this hourly; it pushes to each
  user whose own preferred local hour matches the current tick.
- **send-test-notification** — fires a one-off push to the calling user
  only, used by the "Send test notification" button in Settings.

Setup is ~15 minutes of clicking.

## 1. Apply the migrations

Run these in the Supabase SQL editor, in order:
- `supabase/migrations/0017_push_subscriptions.sql` — push_subscriptions
  table with RLS.
- `supabase/migrations/0018_profile_reminder_prefs.sql` — adds
  `reminder_hour` (0–23, default 20) and `reminder_tz` (default
  'Asia/Kolkata') to profiles, so each user can pick their own time.

## 2. Generate VAPID keys

On your local machine:

```sh
npx web-push generate-vapid-keys
```

You'll get two long strings. Treat the **private** key like a password —
never commit it.

## 3. Set GitHub Actions secret (so the client knows the public key)

GitHub → your repo → Settings → Secrets and variables → Actions → New
repository secret:

- Name: `VITE_VAPID_PUBLIC_KEY`
- Value: the **public** key from step 2

Then add it to `.github/workflows/deploy.yml` under the `Build` step's `env:`
section (already done in this commit). Re-trigger the workflow once
(commit anything, or run it from the Actions tab) so the next build picks
it up.

For local dev, add the same to `.env.local`:

```
VITE_VAPID_PUBLIC_KEY=<your public key>
```

## 4. Set Supabase Edge Function secrets

From the Supabase dashboard → Project Settings → Edge Functions → Secrets,
add:

- `VAPID_PUBLIC_KEY` — same public key as step 2
- `VAPID_PRIVATE_KEY` — the private key from step 2
- `VAPID_SUBJECT` — `mailto:you@example.com` (your email)
- `CRON_SECRET` — a random string only pg_cron will know. Generate one with
  `openssl rand -base64 32` (or any password generator). The function
  rejects every request that doesn't include this in the `Authorization`
  header — without it the endpoint is public on the internet.

Or via the CLI:

```sh
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
supabase secrets set CRON_SECRET="$(openssl rand -base64 32)"
```

## 5. Deploy BOTH Edge Functions

### a. send-daily-reminders (the cron one)

```sh
supabase functions deploy send-daily-reminders --no-verify-jwt
```

`--no-verify-jwt` is fine here because the function self-protects with
`CRON_SECRET`. The shared secret is what gates access, not JWT.

Or via the dashboard: Edge Functions → `send-daily-reminders` → Edit →
paste the latest contents of [index.ts](./index.ts) → make sure
"Verify JWT" is **OFF** → Deploy.

### b. send-test-notification (the "test push" one)

```sh
supabase functions deploy send-test-notification
```

NO `--no-verify-jwt` flag this time — we WANT JWT verification on so only
authenticated users can fire it, and so we can identify which user is
calling from their token.

Or via the dashboard: Edge Functions → Create new function
→ name `send-test-notification` → leave "Verify JWT" **ON** (default)
→ paste contents of [../send-test-notification/index.ts](../send-test-notification/index.ts)
→ Deploy.

Both functions share the same VAPID secrets you set in step 4.

## 6. Schedule the cron

In the Supabase SQL editor, replace `<project-ref>` with your project ref
(found in Project Settings → General) and `<cron-secret>` with the same
random value you set as `CRON_SECRET` in step 4:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'eventplanner-daily-reminders',
  '0 * * * *',                       -- every hour at :00 UTC
  $$
    select net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-daily-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <cron-secret>'
      )
    );
  $$
);
```

The pg_cron job table is only readable by the postgres superuser role on
Supabase, so the secret stays private at rest.

The function runs on every hourly tick, looks up each user's
`reminder_hour` + `reminder_tz` from the profiles table, computes whether
their current local hour matches, and sends only to the matching subset.
So a user with `reminder_hour=20` `reminder_tz='Asia/Kolkata'` gets a
push on the 14:00 UTC tick (= 20:00 IST); a user with
`reminder_hour=9` `reminder_tz='America/Los_Angeles'` gets one on the
17:00 UTC tick (= 09:00 PST). Same function, no schedule change needed
when users pick different times.

To stop the schedule later:

```sql
select cron.unschedule('eventplanner-daily-reminders');
```

## 7. Test

After steps 1–6:

1. Visit the app, sign in.
2. The "Enable reminders" modal appears once. Click **Enable**.
3. Allow notifications in the browser prompt.
4. From the Supabase SQL editor, manually fire the function once:

   ```sql
   select net.http_post(
     url := 'https://<project-ref>.supabase.co/functions/v1/send-daily-reminders',
     headers := '{"Content-Type": "application/json"}'::jsonb
   );
   ```

   If the current UTC hour isn't 14, the function will respond with
   `{"ok": true, "skipped": true}`. To force-test outside the 8 pm IST
   window, temporarily edit `REMINDER_UTC_HOUR` in `index.ts` to the
   current UTC hour, redeploy, fire again, then revert.

5. You should see the notification within ~5 seconds.

## Real-time testing — force-fire the function

To validate the full per-user flow without waiting for the next cron tick
(or your scheduled hour), invoke with `"force": true`. Bypasses the
local-hour check entirely and sends to every subscription matching the
optional `only_user_id` filter.

**Fire to yourself right now** (recommended for debugging):

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-daily-reminders" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  -d '{"force": true, "only_user_id": "<your-user-uuid>"}'
```

Find your user UUID with this SQL: `select auth.uid();` while signed in,
or `select id from profiles where ...`.

**Fire to everyone right now** (use sparingly — every subscriber gets a
real notification):

```sh
curl -X POST "https://csgyhseofrdtxmmpgtmy.supabase.co/functions/v1/send-daily-reminders" \
  -H "Authorization: Bearer <cron-secret>" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

The response echoes `force`, `only_user_id`, and `utc_now` so you can
verify the function received what you sent.

## iOS note

Web Push on iOS **only** works if the app is installed as a PWA — the user
must tap Share → "Add to Home Screen" in Safari. iOS 16.4 or later
required. Without PWA install, push silently does nothing on iOS.

Android and desktop Chrome/Edge/Firefox don't need install.

## Troubleshooting

- **Modal never appears**: check that `VITE_VAPID_PUBLIC_KEY` was set
  AT BUILD TIME (Vite bakes it into the bundle). Re-run the GH Actions
  build after adding the secret.
- **Permission prompt doesn't show on iOS**: confirm it's installed as a
  PWA (look for the icon on home screen, NOT just a Safari bookmark).
- **Notification doesn't arrive**: query `errors_log` for rows with
  context `pushManager.subscribe` or `push_subscriptions.upsert`. Or
  check the Edge Function logs in the Supabase dashboard.
- **Subscription endpoint rejected**: if a user uninstalls or revokes,
  push fails with 410 Gone — the function auto-prunes those rows. No
  action needed.
