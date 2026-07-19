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
4. For a private single-user app, set Authentication so email/password sign-in is enabled.
5. If you do not want any email-based auth friction, disable email confirmation in Supabase Auth settings.
6. Set environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
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
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
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
- `GET /api/assistant/run` is external scheduler target. GitHub Actions pings it hourly, 6 AM-10 PM Eastern; the route itself throttles to one real run per 55 minutes (`MIN_RUN_INTERVAL_MS` in `lib/assistant.ts`), so pings outside that window or too close together are cheap no-ops.
- `POST /api/assistant/run` runs assistant manually for signed-in allowed user.
- Before first run, apply updated `schema.sql`, add env vars above, and add `CRON_SECRET` in Vercel project settings.
- Vercel Hobby cron only supports daily cadence, so use GitHub Actions or another external scheduler for hourly automation.
- Scheduler request:

```txt
GET https://focus-os-neon.vercel.app/api/assistant/run
Authorization: Bearer YOUR_CRON_SECRET
```

- Recommended schedule: `0 6,10,14,18,22 * * *` in `America/New_York`.
- GitHub Actions workflow lives at `.github/workflows/focusos-assistant.yml`.
- Add GitHub repository secret `CRON_SECRET` with the same value as Vercel `CRON_SECRET`.
- Optional GitHub repository variable `FOCUS_OS_ASSISTANT_URL` can override the production endpoint.

## AI Brief and Chat (replaces the Hermes PC agent)

`runAssistant()` (in `lib/assistant.ts`) does all the same calendar/Gmail sync and task/habit bookkeeping it always did, but the final brief (summary, top priorities, risks, next actions) is now synthesized by an LLM call through OpenRouter instead of hand-written rules.

- Get an API key at [openrouter.ai](https://openrouter.ai), set `OPENROUTER_API_KEY` in `.env.local` and in Vercel project settings. Never commit the real key or put it in a `NEXT_PUBLIC_*` var.
- `OPENROUTER_MODEL` is optional; defaults to `anthropic/claude-haiku-4.5`. Any OpenRouter-compatible model slug works — check current slugs and pricing at openrouter.ai/models.
- If `OPENROUTER_API_KEY` is unset, or the OpenRouter call fails for any reason, `runAssistant()` falls back to the original rule-based synthesis automatically. A run never hard-fails because of the LLM step.
- No new scheduling infra needed — the existing GitHub Actions cron (`.github/workflows/focusos-assistant.yml`, 5x/day) already drives this; it just triggers real reasoning now instead of string templates.
- Every run logs one `agent_events` row (`agent_name: "Hermes"`, `action: generate_brief_llm` or `generate_brief_fallback`) so you can see in the Operations page whether a given run actually used the model or fell back.
- `POST /api/assistant/chat` powers the in-app chat panel ("Chat with Hermes" in the sidebar or command palette, ⌘K). Same auth as `/api/assistant/run` (bearer access token, allowlisted email). The model can read tasks/captures/habits/calendar and create/update/complete tasks, create captures, toggle habits, and trigger a full run — all read/write actions log to `agent_events` the same way. `delete_task` and `discard_capture` are server-gated: the model can request them but the server won't execute until you tap Confirm in the chat UI.
- Chat history is client-side only for now (clears on reload, no cross-device sync).
- `runAssistant()` also pulls recently-modified Google Drive files (last 48h) into `external_commitments` alongside Calendar/Gmail, using the same actionable-vs-informational judgment call as Gmail — a file that looks like a deliverable (name matches deadline/review/submit-style language) gets a follow-up task; everything else just shows up in the Calendar page's "Drive activity" panel. Ask Hermes in chat to save a write-up and it'll create a real file (or Google Doc) via `create_drive_deliverable` and hand back the link.
- `GOOGLE_REFRESH_TOKEN` needs `calendar.readonly`, `gmail.readonly`, `drive.readonly`, and `drive.file` scopes. Run `node scripts/google-oauth-setup.mjs` locally to mint a token covering all four (see the script header for the one-time Google Cloud Console redirect-URI setup).

This is the intended replacement for running Hermes on a second PC — once this is set up and working, the local Hermes process and `.env.hermes.local` can be retired. The direct-Supabase-admin path below still works if you want it for something else (e.g. a separate Discord bot), but it's no longer required for the daily brief or chat.

## Hermes Direct Supabase Admin (optional, legacy path)

Hermes runs from a trusted local PC and writes directly to Supabase with a local-only admin secret.

Required safety contract:

- service role or secret key stays only on Hermes PC
- app UI uses normal Supabase auth and RLS
- helper writes insert `agent_events`
- helper writes populate provenance columns
- relevant tables are added to `supabase_realtime`
- new public tables have explicit Data API grants plus RLS policies

Apply this SQL in Supabase:

```bash
supabase/migrations/202606210001_hermes_foundation.sql
```

Hermes local env lives in `.env.hermes.local` on the Hermes PC. See `scripts/hermes-admin/README.md`.

Manual table verification after applying migration:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'agent_events',
    'domains',
    'projects',
    'decisions',
    'school_items',
    'capture_intake',
    'board_recommendations'
  )
order by table_name;
```

Expected: seven rows.

Manual realtime verification:

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in (
    'tasks',
    'captures',
    'capture_intake',
    'external_commitments',
    'assistant_briefs',
    'board_recommendations',
    'decisions',
    'school_items',
    'agent_events',
    'projects',
    'domains'
  )
order by tablename;
```

Expected: eleven rows.
