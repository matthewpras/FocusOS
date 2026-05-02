# Focus OS

Private personal productivity app: tasks, habits, and quick capture.

## Local

```bash
npm install
npm run dev
```

## Supabase

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run `schema.sql`.
4. In Authentication > URL Configuration, add:
   - Local: `http://localhost:3000/auth/callback`
   - Vercel: `https://YOUR_VERCEL_URL/auth/callback`
5. Set environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_VERCEL_URL
NEXT_PUBLIC_ALLOWED_EMAILS=you@example.com
```

`NEXT_PUBLIC_ALLOWED_EMAILS` accepts comma-separated emails. Leave blank only during setup.

Assistant automation env:

```bash
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CRON_SECRET=YOUR_LONG_RANDOM_SECRET
ASSISTANT_USER_EMAIL=you@example.com
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN=YOUR_GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID=primary
GOOGLE_GMAIL_QUERY=newer_than:2d (is:important OR label:starred OR category:primary)
GOOGLE_TIMEZONE=America/New_York
```

## Private Deployment

Recommended setup:

- Vercel production or preview URL
- Supabase magic-link auth
- `NEXT_PUBLIC_ALLOWED_EMAILS` set to your email
- No Vercel password protection, so iPhone has no extra prompt

Deploy:

```bash
npx vercel login
npx vercel deploy --prod
```

After deploy, set same env vars in Vercel project settings, then redeploy.

## Assistant Automation

- Home includes assistant summary card with latest brief, priorities, focus block, risks, and manual run button.
- `GET /api/assistant/run` is external scheduler target. Route only executes during `6 AM / 10 AM / 2 PM / 6 PM / 10 PM` Eastern.
- `POST /api/assistant/run` runs assistant manually for signed-in allowed user.
- Before first run, apply updated `schema.sql`, add env vars above, and add `CRON_SECRET` in Vercel project settings.
- Vercel Hobby cron only supports daily cadence, so use GitHub Actions or another external scheduler for 4-hour automation.
- Scheduler request:

```txt
GET https://focus-os-neon.vercel.app/api/assistant/run
Authorization: Bearer YOUR_CRON_SECRET
```

- Recommended schedule: `0 6,10,14,18,22 * * *` in `America/New_York`.
- GitHub Actions workflow lives at `.github/workflows/focusos-assistant.yml`.
- Add GitHub repository secret `CRON_SECRET` with the same value as Vercel `CRON_SECRET`.
- Optional GitHub repository variable `FOCUS_OS_ASSISTANT_URL` can override the production endpoint.
