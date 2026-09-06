# RehabLab

Personal recovery tracking with a fast daily check-in and local-first history.

## Local development

```sh
npm install
npm run dev
```

The app works without cloud configuration and stores logs in the browser.

## Optional cloud history

Cloud history uses Supabase anonymous authentication. To enable it:

1. Create a Supabase project and enable anonymous sign-ins.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Add these environment variables to Vercel and local development:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The app keeps local drafts and falls back to local storage if cloud sync is unavailable. Environment files are intentionally ignored by Git.
