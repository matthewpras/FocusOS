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
