# FocusOS Hermes Command Center Design

## Decision

FocusOS will stay on the current Next.js, Vercel, and Supabase foundation. The overhaul will keep the existing deployment and auth plumbing, expand the Supabase model, and make the app a realtime command center for Hermes-driven operations.

Hermes will have direct Supabase admin access from a trusted local PC. The browser app will continue to use normal Supabase auth and RLS. This avoids a high-friction custom API dependency for day-to-day work while keeping the UI safe for normal signed-in use.

## Non-Negotiable Conditions

- Local-only Hermes secret storage.
- Audit table for agent actions.
- Provenance columns on operational tables.
- Realtime enabled on relevant tables.
- Small admin helper layer for Hermes.
- App UI keeps normal auth and RLS.

## Architecture

The system has three actors:

- FocusOS UI: Next.js app deployed on Vercel. It authenticates with normal Supabase browser auth, respects RLS, and subscribes to realtime changes.
- Supabase: source of truth for tasks, captures, projects, school items, briefs, recommendations, and audit history.
- Hermes local agent: trusted local admin process. It reads a local-only secret, uses Supabase admin access, writes structured operational data, and records audit events.

The current app already has working pieces: tasks, habits, captures, external commitments, assistant briefs, Obsidian export, RLS, and Vercel deployment. The overhaul will extend this rather than replacing it.

## Data Model

Existing tables remain but gain provenance fields:

- `source_agent`
- `source_run_id`
- `source_kind`
- `source_ref`
- `created_by_agent`
- `agent_confidence`

New operational tables:

- `agent_events`: append-only audit trail of Hermes actions.
- `domains`: high-level life/work/school areas.
- `projects`: active outcomes tied to domains.
- `goals`: longer-term targets tied to domains/projects.
- `decisions`: pending decisions and recommendations.
- `school_items`: classes, deadlines, study plans, administrative obligations.
- `capture_intake`: enriched capture records with classification, summary, tags, source link, and Obsidian routing metadata.
- `board_recommendations`: recommendations from Hermes, Nova, Atlas, Pulse, and Dev.

Tables exposed to the browser keep RLS enabled. Hermes uses admin access from local machine only, so admin writes can bypass RLS while still producing audit rows.

## Realtime

Realtime should be enabled for:

- `tasks`
- `captures`
- `capture_intake`
- `external_commitments`
- `assistant_briefs`
- `agent_events`
- `domains`
- `projects`
- `goals`
- `decisions`
- `school_items`
- `board_recommendations`

The UI will refresh relevant dashboard panels when these tables change. Realtime subscriptions will stay scoped by `user_id` where tables include user ownership.

## Hermes Local Secrets

Hermes secrets live only on the Hermes PC. They must not be committed, stored in browser-visible env vars, or copied into app source.

Expected local env:

```bash
FOCUSOS_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
FOCUSOS_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_OR_SECRET_KEY"
FOCUSOS_USER_EMAIL="your@email.com"
FOCUSOS_AGENT_NAME="Hermes"
```

FocusOS repo will include a template and setup instructions, not real secrets.

## Admin Helper Layer

Add a small local helper layer for Hermes under `scripts/hermes-admin/`.

Responsibilities:

- Load local-only env.
- Resolve target user by email.
- Insert audit rows.
- Add provenance fields automatically.
- Provide typed helpers for common writes:
  - create capture intake
  - update task
  - write daily brief
  - write board recommendation
  - mark slipping item
  - create school item

The helper will stay thin. No large framework, no second backend, no duplicated business system.

## UI Overhaul

Primary tabs:

- Hermes Command: today priorities, agenda, important email signals, slipping work, board recommendations, daily operating brief.
- Capture Inbox: universal intake with classification, decisions, follow-ups, Obsidian routing.
- Tasks and Reminders: execution queue with due dates, priorities, project/domain links, slipping status.
- Projects and Domains: active outcomes grouped by life area.
- School: class obligations, deadlines, study blocks, admin messages, prep reminders.
- Knowledge Intake: Obsidian-bound captures, YouTube links, articles, screenshots, research, voice reflections.
- Reviews: daily/weekly operating reviews, risks, wins, open loops.

The app will feel like a dense private operations cockpit, not a marketing dashboard. It will prioritize scan speed, trust, and next action clarity.

## Capture Workflow

Hermes and the UI both write captures into Supabase. Hermes enriches captures with:

- type: task, event, Obsidian note, school item, follow-up, finance item, automation idea, ignore, decision needed.
- source link.
- summary.
- tags.
- key takeaways.
- "what this means for me".
- Obsidian routing target.
- confidence and provenance.

The app will show raw inbox and classified intake side by side until triaged.

## Obsidian Workflow

Obsidian remains the long-term knowledge brain. FocusOS stores operational metadata and structured intake packages. Hermes handles local file writes to the iCloud/Obsidian folder when possible.

The deployed app will keep its existing Obsidian export route as fallback, but local Hermes is preferred for real file-system work because Vercel cannot access the local vault.

## Error Handling

- If Hermes writes fail, the helper will return clear errors and avoid partial silent writes.
- If audit insert fails, helper will fail closed for destructive actions and warn for harmless note/capture writes.
- If realtime is unavailable, UI will still load from normal Supabase queries.
- If a table is not yet migrated, UI panels will degrade to setup/empty states rather than crash.

## Testing And Verification

Before shipping:

- `npm run lint`
- `npm run build`
- verify signed-in UI still uses normal auth and RLS
- verify Hermes helper writes with local env only
- verify audit rows appear after helper writes
- verify provenance columns populate
- verify realtime refreshes changed dashboard panels
- verify mobile dashboard/capture flows

## Rollout

1. Add schema migration for audit/provenance/core operational tables.
2. Add Hermes admin helper with local env template.
3. Update hooks/types for new tables.
4. Rebuild dashboard around Hermes Command.
5. Add capture classification and knowledge intake views.
6. Add projects/domains/school/reviews.
7. Verify realtime and RLS boundaries.
