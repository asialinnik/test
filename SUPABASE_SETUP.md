# Cross-device sync & deployment

This app works two ways:

- **Local-only** (no setup): all data lives in the browser on one device.
- **Synced** (Supabase): sign in with your email and the same data appears on
  every device — iPhone, laptop, etc.

To enable sync you need a free Supabase project, then deploy to Vercel.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name and a strong database password (you won't need it day-to-day).
3. Wait ~1 minute for it to provision.

## 2. Create the data table

In the Supabase dashboard, open **SQL Editor** → **New query**, paste this, and
click **Run**:

```sql
-- One row per user, holding their whole app state as JSON.
create table if not exists public.app_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Lock it down: each user can only see and change their own row.
alter table public.app_data enable row level security;

create policy "own row - select" on public.app_data
  for select using (auth.uid() = user_id);
create policy "own row - insert" on public.app_data
  for insert with check (auth.uid() = user_id);
create policy "own row - update" on public.app_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 3. Turn on email login (6-digit code)

1. **Authentication → Providers → Email**: make sure **Email** is enabled.
   Turn **Confirm email** ON (this is what sends the code).
2. **Authentication → Email Templates → Magic Link**: replace the body so it
   shows the code instead of (or in addition to) a link. Add this line:

   ```
   Your sign-in code: {{ .Token }}
   ```

   (The default template only has a link. Adding `{{ .Token }}` makes the
   6-digit code appear, which is what the app asks you to type. This is more
   reliable than links inside an iPhone home-screen app.)

## 4. Get your API keys

**Settings → API**. Copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

For local development, create a file named `.env.local` (copy `.env.example`)
and paste them in.

---

## 5. Deploy to Vercel

1. Go to <https://vercel.com> → sign in with GitHub.
2. **Add New → Project** → import this repository.
3. Vercel auto-detects Vite (build `npm run build`, output `dist` — already set
   in `vercel.json`).
4. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. You'll get a URL like `your-app.vercel.app`.

### After the first deploy

In Supabase, set **Authentication → URL Configuration → Site URL** to your
Vercel URL (e.g. `https://your-app.vercel.app`). This keeps email/auth tied to
your real domain.

---

## 6. Install it on your iPhone

It's a PWA — there's nothing in the App Store; you "install" it from Safari:

1. Open your Vercel URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** button (square with an up-arrow).
3. Scroll down → **Add to Home Screen** → **Add**.
4. It now has its own icon and opens full-screen like a normal app.

Sign in with your email once on each device; after that your data stays in sync.

> Note: the microphone/voice input needs HTTPS — which your Vercel URL provides
> automatically — and you'll be asked to allow microphone access the first time.
