# Hermes Admin Helper

Hermes writes directly to Supabase from a trusted local PC. Secrets stay local.

## Local Secret File

Create `.env.hermes.local` on the Hermes PC only:

```bash
FOCUSOS_SUPABASE_URL="https://your_project.supabase.co/"
FOCUSOS_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_OR_SECRET_KEY"
FOCUSOS_USER_EMAIL="your@email.com"
FOCUSOS_AGENT_NAME="Hermes"
FOCUSOS_DEFAULT_RUN_ID=""
FOCUSOS_OBSIDIAN_VAULT_PATH=""
```

Rules:

- Never commit `.env.hermes.local`.
- Never put the service role key in `NEXT_PUBLIC_*`.
- Never paste the service role key into browser code.
- Rotate the key if it appears in logs, chat, GitHub, or a shared machine.

## MVP Helpers

- `loadHermesEnv()`
- `createHermesSupabaseAdmin(env)`
- `resolveUserIdByEmail(supabase, email)`
- `logAgentEvent(context, input)`
- `withAudit(context, audit, actionFn)`
- `createCaptureIntake(context, input)`
- `upsertTask(context, input)`
- `writeBrief(context, input)`
- `writeBoardRecommendation(context, input)`
- `logDecision(context, input)`
- `createSchoolItem(context, input)`
- `upsertExternalCommitment(context, input)`

## Read Helpers (`reads.ts`)

For a bot that needs to see state before acting (daily brief generation, "what's overdue", answering questions in Discord):

- `getOpenCaptures(context, limit?)` — unconverted inbox items, newest first.
- `getTasks(context, { completed?, limit? })` — tasks for the user, optionally filtered by completion.
- `getOpenTasksDueBy(context, isoDate)` — open tasks due on or before a date (overdue + due-today when called with today's date).
- `getLatestBrief(context)` — most recent `assistant_briefs` row, or `null`.
- `getRecentAgentEvents(context, limit?)` — audit trail, newest first.
- `getOpenDecisions(context)` — open items from `decisions`, soonest `decide_by` first.
- `getUpcomingCommitments(context, limit?)` — `google_calendar`-sourced rows from `external_commitments`, soonest `starts_at` first.

All read helpers take `{ supabase, userId }` (no `agentName`/`runId` needed — reads aren't audited).

## Wiring a Discord Bot on the Hermes Windows PC

The Discord bot code itself lives outside this repo, on the Windows machine, next to
the Hermes agent. This library is the seam it plugs into — same trusted-local-PC model
as any other Hermes script, just called from a bot process instead of a one-off script.

Pattern:

1. Bot process loads `.env.hermes.local` via `loadHermesEnv()` — never ship the service
   role key inside the Discord bot's own config or source control.
2. On startup, resolve the FocusOS user once with `resolveUserIdByEmail()` and cache the
   `userId` for the process lifetime.
3. Build a `context = { supabase, userId, agentName: "Hermes", runId }` once per run
   (a `runId`, e.g. a UUID per bot session or per command, keeps `agent_events` groupable).
4. Slash commands / messages map to helper calls:
   - "what's overdue" / "today's brief" → `getOpenTasksDueBy`, `getLatestBrief`, `getOpenCaptures`.
   - "add a task" / "schedule X" → `upsertTask`, `createCaptureIntake` (for anything that
     should land in the FocusOS inbox for triage instead of going straight to a task).
   - daily brief generation → read `getTasks`/`getOpenCaptures`/`getOpenDecisions`, compose
     the brief, then persist it with `writeBrief` so it shows up in the app, not just Discord.
   - anything the bot does on the user's behalf should go through `withAudit` or
     `logAgentEvent` so it shows up in FocusOS's own audit trail — this is what makes the
     integration feel OEM rather than bolted-on: actions taken via Discord are indistinguishable
     from actions taken via the app's own agent-run pipeline.
5. Calendar/scheduling: "add this to my calendar" or "what's on my calendar" should go through
   `upsertExternalCommitment` / `getUpcomingCommitments` (see "Google Calendar Sync" below), not
   `upsertTask` — commitments and tasks are different concepts and FocusOS's Calendar page reads
   from `external_commitments` specifically.

This repo cannot reach the Windows PC or the Discord bot process directly — the deliverable
here is the library surface (reads + writes + audit) and this contract. The bot-side code
(Discord.js handlers, slash command registration, scheduling loop) is Windows-side work.

## Google Calendar Sync (Hermes polling)

FocusOS does not hold a Google OAuth client or any calendar credentials — that surface stays
entirely on the Hermes Windows PC, same trusted-local-PC model as everything else in this
library. FocusOS only ever reads `external_commitments` rows that Hermes writes.

Pattern:

1. On the Windows PC, Hermes authenticates to the Google Calendar API with its own OAuth
   client/refresh token (outside this repo, outside FocusOS entirely).
2. On a schedule (e.g. every 5-15 min, or on a webhook/push notification from Google), Hermes
   lists calendar events in the sync window and calls `upsertExternalCommitment(context, {...})`
   once per event:
   - `source: "google_calendar"`
   - `sourceId`: the Google Calendar event id (stable across polls — this is what makes the
     upsert idempotent instead of duplicating rows on every run)
   - `title`, `details`, `startsAt` (event start, ISO), and optionally `payload` for the raw
     event JSON if you want it queryable later
   - `sourceKind: "calendar_sync"` (this is the default when `source` is `"google_calendar"`,
     no need to pass it explicitly)
3. If an event is deleted/cancelled on Google's side, delete the matching row (match on
   `source_id`) rather than leaving stale rows for FocusOS to show.
4. FocusOS's `/calendar` page reads `external_commitments` directly via its own Supabase client
   (see `hooks/useExternalCommitments.ts`) and re-renders on `postgres_changes` — no polling
   needed on the FocusOS side, Hermes's upserts show up live.
5. For "what's on my calendar" / "what's coming up" style bot queries, use
   `getUpcomingCommitments(context, limit?)` rather than re-querying Google directly — it reads
   the same synced data the FocusOS UI shows, so the bot and the app never disagree.
6. Gmail-sourced follow-ups use the same table (`source: "gmail"`) and the same
   `upsertExternalCommitment` helper — `sourceId` there is the Gmail message id, and
   `sourceKind` defaults to `"gmail_sync"`.

Dedup note: `external_commitments` already has a unique constraint on
`(user_id, source, source_id)`, which is exactly what `upsertExternalCommitment` upserts against
(`onConflict: "user_id,source,source_id"`) — no migration needed, this was already in place.

## Smoke Test

1. Apply `supabase/migrations/202606210001_hermes_foundation.sql`.
2. Create `.env.hermes.local`.
3. Load env with `loadHermesEnv()`.
4. Create Supabase admin client with `createHermesSupabaseAdmin(env)`.
5. Resolve user id with `resolveUserIdByEmail()`.
6. Call `createCaptureIntake()`.
7. Confirm row exists in `capture_intake`.
8. Confirm row exists in `agent_events`.

New Supabase projects may require explicit Data API grants for public tables. Migration includes authenticated grants plus RLS policies, and service role grants for Hermes.
