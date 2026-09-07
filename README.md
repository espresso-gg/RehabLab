# RehabLab

A local-first daily recovery tracker for pain, symptoms, activity, and sleep.

## Development

```bash
npm install
npm run dev
```

RehabLab works without a backend by default. To enable optional passwordless accounts and cross-device cloud backup, follow [the Supabase setup guide](docs/SUPABASE_SETUP.md).

Never add a Supabase secret key to this frontend project. The browser uses only the public project URL and publishable key; database access is protected with Row Level Security.
