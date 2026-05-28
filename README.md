# Event Planner

A free, mobile-first PWA for managing event budgets (weddings, etc.) — built so a small group of family members can collaborate on a shared expense list and a separate plan/forecast.

**Stack:** React + Vite + TypeScript + Tailwind v4 · Supabase (Postgres + Auth + RLS) · GitHub Pages.

This README covers the **base setup** (auth + DB connection + deploy pipeline). Features (events, transactions, plan items, sharing) are added in later iterations.

## Prerequisites

- Node 22+ and npm 10+
- A free [Supabase](https://supabase.com/) account
- A [Google Cloud Console](https://console.cloud.google.com/) project for OAuth (free)
- A GitHub account with this repo

## One-time setup

### 1. Supabase project

1. Sign in at [supabase.com](https://supabase.com/) (use GitHub).
2. **New project** → name `event-planner` → region **ap-south-1 (Mumbai)** → generate a strong DB password and save it.
3. Wait ~2 minutes for the project to be provisioned.
4. **Project Settings → API**: copy the **Project URL** and **anon public** key.

### 2. Run the migration

In the Supabase dashboard → **SQL Editor** → paste the contents of [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql) and run it. This creates the `profiles` table, the auto-create-on-signup trigger, and RLS policies.

### 3. Google OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), create a new project `event-planner`.
2. **APIs & Services → OAuth consent screen** → External → fill in app name, support email, developer email → add scope `openid email profile` → save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Web application:
   - Authorized redirect URIs:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Save and copy the **Client ID** and **Client Secret**.

### 4. Enable Google in Supabase Auth

1. Supabase dashboard → **Authentication → Providers → Google** → enable, paste Client ID + Client Secret → save.
2. **Authentication → URL Configuration** → set **Site URL** to your live GitHub Pages URL, e.g. `https://<your-username>.github.io/EventPlanner/`. Under **Redirect URLs**, add both `http://localhost:5173/EventPlanner/**` (local dev) and `https://<your-username>.github.io/EventPlanner/**` (production). The `/EventPlanner/` path is required because [vite.config.ts](vite.config.ts) sets `base: '/EventPlanner/'`.

### 5. Local dev

```bash
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open **`http://localhost:5173/EventPlanner/`** (note the path — required because of the `base` setting in [vite.config.ts](vite.config.ts)). Sign in with Google → fill phone → see Home.

### 6. Deploy to GitHub Pages

1. GitHub repo → **Settings → Pages → Source = GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main`. The `Deploy to GitHub Pages` workflow builds and publishes the site.
4. Once live, copy your Pages URL into Supabase **Site URL** and into the Google OAuth Authorized redirect URIs.

### 7. Keep-alive

The `Supabase keep-alive` workflow runs every 5 days to prevent Supabase's free-tier projects from pausing after 7 days of inactivity. No action needed once the secrets above are set.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check then production build into `dist/`
- `npm run preview` — preview the built site locally
- `npm run typecheck` — TypeScript only, no build

## Project structure

```
src/
  lib/
    supabase.ts        — Supabase client + Profile type
    auth.tsx           — AuthProvider, useAuth() hook
  components/
    SignIn.tsx         — Google button + magic link form
    PhoneCapture.tsx   — one-time phone capture after first sign-in
    Home.tsx           — placeholder; features go here next
  App.tsx              — top-level branching (SignIn / PhoneCapture / Home)
  main.tsx             — entry point
supabase/
  migrations/
    0001_profiles.sql  — profiles table + RLS + triggers
.github/workflows/
  deploy.yml           — push-to-main → GH Pages
  keep-alive.yml       — every 5 days → ping Supabase
```

## Cost

Zero, as long as we stay within the Supabase free tier (500 MB DB / 50 k MAU / unlimited API calls). No credit card needed.
