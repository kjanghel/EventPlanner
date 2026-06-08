# Daily Reminders — One-Time Setup

This Edge Function sends a Web Push notification to every subscribed device
at 8 pm IST (= 14:30 UTC) every day. Setup is ~15 minutes of clicking.

## 1. Apply the migration

Run `supabase/migrations/0017_push_subscriptions.sql` in the Supabase SQL
editor. Creates the `push_subscriptions` table with RLS.

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

## 5. Deploy the Edge Function

```sh
supabase functions deploy send-daily-reminders --no-verify-jwt
```

`--no-verify-jwt` lets the cron job call it without an auth header. RLS
still protects the data — the function uses the service role only inside
itself, never exposes it to callers.

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

The function checks the UTC hour itself and only fans out notifications at
14:00 UTC (= 8 pm IST). The other 23 invocations per day are no-op pings
that return immediately — well within free-tier limits (24/day × 30 = 720
invocations/month vs the 500k free quota).

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
