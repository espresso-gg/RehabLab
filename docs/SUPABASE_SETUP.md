# Supabase setup

RehabLab remains fully usable with local storage when Supabase is not configured. Adding Supabase enables optional passwordless sign-in and cross-device backup.

## 1. Create the project

1. Create a project at [database.new](https://database.new/).
2. Choose a strong database password and a region near the intended users.
3. Wait for the project to finish provisioning.

## 2. Create the protected table

1. Open **SQL Editor** in the Supabase dashboard.
2. Copy the contents of [`supabase/migrations/202609070001_create_daily_logs.sql`](../supabase/migrations/202609070001_create_daily_logs.sql).
3. Run the SQL once.

The migration creates `daily_logs`, enables Row Level Security, revokes anonymous access, and grants signed-in users access only to rows whose `user_id` matches their authenticated identity.

## 3. Configure passwordless email

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `https://rehablab.vercel.app`.
3. Add these redirect URLs:
   - `https://rehablab.vercel.app/**`
   - `http://localhost:5173/**`
4. Confirm the Email provider is enabled under **Authentication → Providers**.

For production volume, configure a custom SMTP provider instead of relying on the default trial email service.

## 4. Get the browser-safe credentials

Open the project **Connect** dialog and copy:

- Project URL
- Publishable key beginning with `sb_publishable_`

Do not use a secret key or legacy `service_role` key. Secret keys bypass Row Level Security and must never be shipped to a browser.

## 5. Configure local development

Create `.env.local` in the repository root:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Restart the Vite development server after changing environment variables.

## 6. Configure Vercel

1. Open the RehabLab project in Vercel.
2. Go to **Settings → Environment Variables**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Apply them to Production and Preview environments.
5. Redeploy the latest `main` deployment.

When both variables are present, a **Cloud Backup** card appears at the bottom of Progress. Without them, the cloud interface remains hidden and all existing local functionality continues normally.

## Sync behavior

- Local saves always complete first, including while offline.
- Signed-in users synchronize automatically when online.
- Newer `savedAt` timestamps win during conflicts.
- A manual **Sync now** action is available.
- Local records are linked to the first cloud account used on that browser to prevent accidental cross-account uploads.
- Signing out does not erase local recovery records.
