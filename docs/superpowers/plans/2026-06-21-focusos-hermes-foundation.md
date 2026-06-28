# FocusOS Hermes Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Hermes contract foundation: local-only admin writes, audit trail, provenance fields, MVP operational tables, realtime wiring, and a small admin helper layer while preserving normal browser auth + RLS.

**Architecture:** Hermes runs on a trusted local PC and writes directly to Supabase with a local-only admin key. FocusOS browser UI uses normal Supabase auth, RLS, and realtime subscriptions. Supabase stores operational state and audit history; helper functions add provenance and `agent_events` rows for Hermes writes.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase JS 2.105, Supabase Postgres/RLS/Realtime, TypeScript, Node `node:test`, existing shadcn-style components.

---

## Hermes Contract Boundary

MVP includes:

- provenance fields on `tasks`, `captures`, `capture_intake`, `assistant_briefs`, `external_commitments`, `decisions`, `school_items`, `board_recommendations`, and `projects`
- `agent_events`
- `domains`
- `projects`
- `decisions`
- `school_items`
- `capture_intake`
- `board_recommendations`
- Hermes local admin helper layer
- realtime subscriptions for MVP tables
- Operations/audit surface

Operations is desktop-only in MVP. Mobile nav stays focused on five daily-use routes: Home, Tasks, Calendar, Habits, Inbox. Add mobile Operations later only if audit checks become frequent on phone.

Phase 2 excludes:

- `goals`
- `review_entries`
- `slipping_items`
- finance desk
- remote `/api/hermes/*`
- deeper Obsidian routing UI

Compatibility decision:

- Keep existing assistant-era columns: `assistant_key`, `assistant_source`, `created_by_assistant`.
- Add Hermes provenance beside them for MVP.
- Do not migrate old assistant fields in this plan.
- Later cleanup can consolidate provenance after Hermes flow proves stable.

Environment decision:

- App/Vercel env keeps current names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_EMAILS`, `NEXT_PUBLIC_ALLOWED_EMAILS`.
- Hermes local env uses separate names: `FOCUSOS_SUPABASE_URL`, `FOCUSOS_SUPABASE_SERVICE_ROLE_KEY`, `FOCUSOS_USER_EMAIL`, `FOCUSOS_AGENT_NAME`.
- This split is intentional so browser/app deployment config never gets confused with Hermes-local admin secrets.

Execution hygiene:

- All commit steps below assume Task 0 completed first.
- Do not execute implementation work on a dirty `main` branch.
- If repo already has unrelated untracked probe files, relocate them before running lint/build.
- `supabase/migrations/` does not exist yet; Task 2 creates migration workflow from scratch and mirrors it into `schema.sql`.

## File Structure

- Modify `package.json`: add `test` script.
- Create `supabase/migrations/202606210001_hermes_foundation.sql`: MVP schema, provenance, audit table, realtime publication.
- Modify `schema.sql`: append same migration for one-file setup.
- Modify `types/index.ts`: add contract types.
- Create `scripts/hermes-admin/env.ts`: local-only env loader.
- Create `scripts/hermes-admin/provenance.ts`: provenance and audit builders.
- Create `scripts/hermes-admin/client.ts`: Supabase admin client and user lookup.
- Create `scripts/hermes-admin/writes.ts`: MVP write helpers.
- Create `scripts/hermes-admin/README.md`: Hermes local setup.
- Create tests under `scripts/hermes-admin/*.test.mjs`.
- Create `hooks/useAgentEvents.ts`: normal-auth/RLS audit hook.
- Create `app/operations/page.tsx`: audit and safety contract page.
- Modify `components/app-sidebar.tsx`: add desktop Operations nav.
- Modify `README.md`: document Hermes setup and Supabase verification.

---

### Task 0: Workspace Hygiene And Isolation

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Check current branch and working tree**

Run:

```bash
git branch --show-current
git status --short
```

Expected: current branch and working-tree state are visible before changes. If already on a feature branch with a clean tree, continue. If on `main`, create an isolated branch in Step 3.

- [ ] **Step 2: Ignore local worktrees**

Ensure `.gitignore` contains:

```gitignore
.worktrees/
```

- [ ] **Step 3: Move repo-root probe files if present**

Run:

```bash
mkdir -p /tmp/focusos-probes
for file in \
  .focusos_blocker_check.js \
  .focusos_columns_probe.js \
  .focusos_runs_latest.js \
  .focusos_runs_probe.js \
  .focusos_schema_probe.js \
  .tmp_focusos_blocker_check.js \
  .tmp_focusos_schema_probe.js
do
  if [ -f "$file" ] && ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    mv "$file" /tmp/focusos-probes/
  fi
done
```

Expected: only untracked probe files move. Tracked files are not touched.

- [ ] **Step 4: Create feature branch if needed**

If current branch is `main`, run:

```bash
git switch -c codex/hermes-foundation
```

Expected: branch becomes `codex/hermes-foundation`.

- [ ] **Step 5: Verify clean implementation baseline**

Run:

```bash
git status --short
npm run lint
npm run build
```

Expected:

- no untracked probe files remain
- lint passes after probe cleanup
- build passes
- only intentional `.gitignore` change may remain before commit

- [ ] **Step 6: Commit hygiene change if `.gitignore` changed**

```bash
git add .gitignore
git commit -m "chore: ignore local worktrees"
```

---

### Task 1: Test Script Baseline

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add test script**

Change `package.json` scripts block to:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --experimental-transform-types --test \"**/*.test.mjs\""
  }
}
```

- [ ] **Step 2: Run existing test**

Run:

```bash
npm test
```

Expected: existing `lib/auth-form.test.mjs` passes.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS after Task 0 probe cleanup. If lint fails on repo-root probe files, Task 0 was not completed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "test: add node test script"
```

---

### Task 2: Supabase Hermes Contract Schema

**Files:**
- Create: `supabase/migrations/202606210001_hermes_foundation.sql`
- Modify: `schema.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/202606210001_hermes_foundation.sql`:

```sql
create extension if not exists "pgcrypto";

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function create_updated_at_trigger(target_table regclass, trigger_name text)
returns void language plpgsql as $$
begin
  if not exists (select 1 from pg_trigger where tgname = trigger_name) then
    execute format(
      'create trigger %I before update on %s for each row execute function update_updated_at_column()',
      trigger_name,
      target_table
    );
  end if;
end;
$$;

create or replace function add_provenance_columns(target_table text)
returns void language plpgsql as $$
begin
  execute format('alter table %I add column if not exists source_agent text', target_table);
  execute format('alter table %I add column if not exists source_run_id text', target_table);
  execute format('alter table %I add column if not exists source_kind text', target_table);
  execute format('alter table %I add column if not exists source_ref text', target_table);
  execute format('alter table %I add column if not exists created_by_agent boolean not null default false', target_table);
  execute format('alter table %I add column if not exists agent_confidence numeric(5,4)', target_table);
  execute format('alter table %I add column if not exists updated_by text', target_table);
end;
$$;

select add_provenance_columns('tasks');
select add_provenance_columns('captures');
select add_provenance_columns('assistant_briefs');
select add_provenance_columns('external_commitments');

alter table tasks add column if not exists domain_id uuid;
alter table tasks add column if not exists project_id uuid;
alter table tasks add column if not exists slipping boolean not null default false;

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('domains'::regclass, 'domains_updated_at');
select add_provenance_columns('domains');
alter table domains enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'domains' and policyname = 'own domains') then
    create policy "own domains" on domains for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create unique index if not exists idx_domains_user_slug on domains (user_id, slug);
create index if not exists idx_domains_user_active_sort on domains (user_id, is_active, sort_order);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid references domains(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  target_date date,
  last_touched_at timestamptz,
  slipping boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('projects'::regclass, 'projects_updated_at');
select add_provenance_columns('projects');
alter table projects enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'own projects') then
    create policy "own projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create unique index if not exists idx_projects_user_slug on projects (user_id, slug);
create index if not exists idx_projects_user_status_target on projects (user_id, status, target_date);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_domain_id_fkey') then
    alter table tasks add constraint tasks_domain_id_fkey foreign key (domain_id) references domains(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_project_id_fkey') then
    alter table tasks add constraint tasks_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
  end if;
end $$;

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid references domains(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','decided','archived')),
  urgency text not null default 'medium' check (urgency in ('low','medium','high')),
  recommended_option text,
  chosen_option text,
  decide_by date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('decisions'::regclass, 'decisions_updated_at');
select add_provenance_columns('decisions');
alter table decisions enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'own decisions') then
    create policy "own decisions" on decisions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_decisions_user_status_due on decisions (user_id, status, decide_by);

create table if not exists school_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid references domains(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  course_code text,
  course_name text,
  item_type text not null check (item_type in ('class','exam','assignment','reading','study_block','admin','rotation','other')),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','done','archived')),
  due_at timestamptz,
  start_at timestamptz,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('school_items'::regclass, 'school_items_updated_at');
select add_provenance_columns('school_items');
alter table school_items enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'school_items' and policyname = 'own school_items') then
    create policy "own school_items" on school_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_school_items_user_status_due on school_items (user_id, status, due_at);

create table if not exists capture_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capture_id uuid references captures(id) on delete cascade,
  intake_type text not null check (intake_type in ('task','event','obsidian_note','school_item','follow_up','finance_item','automation_idea','ignore','decision_needed')),
  title text,
  summary text,
  source_link text,
  tags text[] not null default '{}',
  key_takeaways jsonb not null default '[]'::jsonb,
  what_this_means_for_me text,
  obsidian_target text,
  decision_needed boolean not null default false,
  triage_status text not null default 'new' check (triage_status in ('new','reviewed','converted','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('capture_intake'::regclass, 'capture_intake_updated_at');
select add_provenance_columns('capture_intake');
alter table capture_intake enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capture_intake' and policyname = 'own capture_intake') then
    create policy "own capture_intake" on capture_intake for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create unique index if not exists idx_capture_intake_capture_id on capture_intake (capture_id) where capture_id is not null;
create index if not exists idx_capture_intake_user_status_created on capture_intake (user_id, triage_status, created_at desc);

create table if not exists board_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id uuid references domains(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  agent_name text not null check (agent_name in ('Hermes','Nova','Atlas','Pulse','Dev')),
  title text not null,
  summary text not null,
  recommendation_type text not null check (recommendation_type in ('priority','risk','decision','review','school','finance','systems','health')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'active' check (status in ('active','accepted','dismissed','archived')),
  supporting_points jsonb not null default '[]'::jsonb,
  suggested_actions jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select create_updated_at_trigger('board_recommendations'::regclass, 'board_recommendations_updated_at');
select add_provenance_columns('board_recommendations');
alter table board_recommendations enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'board_recommendations' and policyname = 'own board_recommendations') then
    create policy "own board_recommendations" on board_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_board_recommendations_user_status_created on board_recommendations (user_id, status, created_at desc);

create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_name text not null check (agent_name in ('Hermes','Nova','Atlas','Pulse','Dev')),
  run_id text,
  event_type text not null,
  target_table text,
  target_id uuid,
  action text not null,
  status text not null default 'success' check (status in ('success','warning','failed')),
  summary text,
  payload jsonb not null default '{}'::jsonb,
  error_text text,
  created_at timestamptz not null default now()
);
alter table agent_events enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'agent_events' and policyname = 'own agent_events') then
    create policy "own agent_events" on agent_events for select using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_agent_events_user_created on agent_events (user_id, created_at desc);
create index if not exists idx_agent_events_target on agent_events (target_table, target_id);

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
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
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format('alter publication supabase_realtime add table %I', realtime_table);
    end if;
  end loop;
end $$;
```

- [ ] **Step 2: Append migration to canonical schema**

Append exact contents of `supabase/migrations/202606210001_hermes_foundation.sql` to end of `schema.sql`.

- [ ] **Step 3: Validate SQL text**

Run:

```bash
rg -n "agent_events|source_agent|updated_by|capture_intake|board_recommendations|supabase_realtime" schema.sql supabase/migrations/202606210001_hermes_foundation.sql
```

Expected: all terms appear in both files.

- [ ] **Step 4: Commit**

```bash
git add schema.sql supabase/migrations/202606210001_hermes_foundation.sql
git commit -m "feat: add Hermes contract schema"
```

---

### Task 3: Contract Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add provenance type near top**

Insert after `Category`:

```ts
export type AgentName = "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"

export type SourceKind =
  | "manual_user"
  | "hermes_direct"
  | "assistant_run"
  | "gmail_sync"
  | "calendar_sync"
  | "obsidian_import"
  | "youtube_intake"
  | "web_capture"
  | "system_rule"

export type AgentProvenance = {
  source_agent: AgentName | null
  source_run_id: string | null
  source_kind: SourceKind | null
  source_ref: string | null
  created_by_agent: boolean
  agent_confidence: number | null
  updated_by: string | null
}
```

- [ ] **Step 2: Extend existing write-heavy types**

Change these type declarations:

```ts
export type Task = AgentProvenance & {
```

```ts
export type Habit = {
```

Leave `Habit` unchanged because Hermes contract does not require habit provenance in MVP.

```ts
export type Capture = AgentProvenance & {
```

```ts
export type ExternalCommitment = AgentProvenance & {
```

```ts
export type AssistantBrief = AgentProvenance & {
```

Add to `Task`:

```ts
  domain_id: string | null
  project_id: string | null
  slipping: boolean
```

- [ ] **Step 3: Append MVP table types**

Append:

```ts
export type AgentEvent = {
  id: string
  user_id: string
  agent_name: AgentName
  run_id: string | null
  event_type: string
  target_table: string | null
  target_id: string | null
  action: string
  status: "success" | "warning" | "failed"
  summary: string | null
  payload: Record<string, unknown>
  error_text: string | null
  created_at: string
}

export type Domain = AgentProvenance & {
  id: string
  user_id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Project = AgentProvenance & {
  id: string
  user_id: string
  domain_id: string | null
  name: string
  slug: string
  description: string | null
  status: "active" | "paused" | "completed" | "archived"
  priority: Priority
  target_date: string | null
  last_touched_at: string | null
  slipping: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Decision = AgentProvenance & {
  id: string
  user_id: string
  domain_id: string | null
  project_id: string | null
  title: string
  description: string | null
  status: "open" | "decided" | "archived"
  urgency: Priority
  recommended_option: string | null
  chosen_option: string | null
  decide_by: string | null
  created_at: string
  updated_at: string
}

export type SchoolItem = AgentProvenance & {
  id: string
  user_id: string
  domain_id: string | null
  project_id: string | null
  course_code: string | null
  course_name: string | null
  item_type: "class" | "exam" | "assignment" | "reading" | "study_block" | "admin" | "rotation" | "other"
  title: string
  description: string | null
  status: "open" | "done" | "archived"
  due_at: string | null
  start_at: string | null
  priority: Priority
  created_at: string
  updated_at: string
}

export type CaptureIntake = AgentProvenance & {
  id: string
  user_id: string
  capture_id: string | null
  intake_type:
    | "task"
    | "event"
    | "obsidian_note"
    | "school_item"
    | "follow_up"
    | "finance_item"
    | "automation_idea"
    | "ignore"
    | "decision_needed"
  title: string | null
  summary: string | null
  source_link: string | null
  tags: string[]
  key_takeaways: string[]
  what_this_means_for_me: string | null
  obsidian_target: string | null
  decision_needed: boolean
  triage_status: "new" | "reviewed" | "converted" | "archived"
  created_at: string
  updated_at: string
}

export type BoardRecommendation = AgentProvenance & {
  id: string
  user_id: string
  domain_id: string | null
  project_id: string | null
  agent_name: AgentName
  title: string
  summary: string
  recommendation_type: "priority" | "risk" | "decision" | "review" | "school" | "finance" | "systems" | "health"
  priority: Priority
  status: "active" | "accepted" | "dismissed" | "archived"
  supporting_points: string[]
  suggested_actions: string[]
  expires_at: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Hermes contract types"
```

---

### Task 4: Local Env Loader

**Files:**
- Create: `scripts/hermes-admin/env.ts`
- Create: `scripts/hermes-admin/env.test.mjs`

- [ ] **Step 1: Write tests**

Create `scripts/hermes-admin/env.test.mjs`:

```js
import test from "node:test"
import assert from "node:assert/strict"

const envModule = await import("./env.ts")

test("parseHermesEnvFile reads quoted and unquoted values", () => {
  const parsed = envModule.parseHermesEnvFile(`
FOCUSOS_SUPABASE_URL="https://example.supabase.co"
FOCUSOS_SUPABASE_SERVICE_ROLE_KEY=service-key
FOCUSOS_USER_EMAIL="you@example.com"
FOCUSOS_AGENT_NAME=Hermes
FOCUSOS_DEFAULT_RUN_ID=run-1
FOCUSOS_OBSIDIAN_VAULT_PATH="/Users/matthew/Obsidian"
`)

  assert.equal(parsed.FOCUSOS_SUPABASE_URL, "https://example.supabase.co")
  assert.equal(parsed.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY, "service-key")
  assert.equal(parsed.FOCUSOS_USER_EMAIL, "you@example.com")
  assert.equal(parsed.FOCUSOS_AGENT_NAME, "Hermes")
  assert.equal(parsed.FOCUSOS_DEFAULT_RUN_ID, "run-1")
  assert.equal(parsed.FOCUSOS_OBSIDIAN_VAULT_PATH, "/Users/matthew/Obsidian")
})

test("validateHermesEnv rejects missing required values", () => {
  const result = envModule.validateHermesEnv({
    FOCUSOS_SUPABASE_URL: "https://example.supabase.co",
  })

  assert.deepEqual(result, {
    ok: false,
    error:
      "Missing Hermes env: FOCUSOS_SUPABASE_SERVICE_ROLE_KEY, FOCUSOS_USER_EMAIL, FOCUSOS_AGENT_NAME",
  })
})

test("validateHermesEnv accepts complete values", () => {
  const result = envModule.validateHermesEnv({
    FOCUSOS_SUPABASE_URL: "https://example.supabase.co",
    FOCUSOS_SUPABASE_SERVICE_ROLE_KEY: "service-key",
    FOCUSOS_USER_EMAIL: "you@example.com",
    FOCUSOS_AGENT_NAME: "Hermes",
  })

  assert.equal(result.ok, true)
  assert.equal(result.env.FOCUSOS_AGENT_NAME, "Hermes")
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- scripts/hermes-admin/env.test.mjs
```

Expected: FAIL because `env.ts` missing.

- [ ] **Step 3: Implement env loader**

Create `scripts/hermes-admin/env.ts`:

```ts
import { readFileSync } from "node:fs"
import path from "node:path"

export type HermesEnv = {
  FOCUSOS_SUPABASE_URL: string
  FOCUSOS_SUPABASE_SERVICE_ROLE_KEY: string
  FOCUSOS_USER_EMAIL: string
  FOCUSOS_AGENT_NAME: "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"
  FOCUSOS_DEFAULT_RUN_ID?: string
  FOCUSOS_OBSIDIAN_VAULT_PATH?: string
}

type EnvResult =
  | { ok: true; env: HermesEnv }
  | { ok: false; error: string }

const requiredKeys = [
  "FOCUSOS_SUPABASE_URL",
  "FOCUSOS_SUPABASE_SERVICE_ROLE_KEY",
  "FOCUSOS_USER_EMAIL",
  "FOCUSOS_AGENT_NAME",
] as const

const allowedAgents = new Set(["Hermes", "Nova", "Atlas", "Pulse", "Dev"])

export function parseHermesEnvFile(contents: string) {
  const values: Record<string, string> = {}

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) continue

    const key = line.slice(0, equalsIndex).trim()
    const rawValue = line.slice(equalsIndex + 1).trim()
    values[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }

  return values
}

export function validateHermesEnv(values: Record<string, string | undefined>): EnvResult {
  const missing = requiredKeys.filter((key) => !values[key]?.trim())

  if (missing.length) {
    return {
      ok: false,
      error: `Missing Hermes env: ${missing.join(", ")}`,
    }
  }

  const agentName = values.FOCUSOS_AGENT_NAME!.trim()
  if (!allowedAgents.has(agentName)) {
    return {
      ok: false,
      error: "FOCUSOS_AGENT_NAME must be one of Hermes, Nova, Atlas, Pulse, Dev.",
    }
  }

  return {
    ok: true,
    env: {
      FOCUSOS_SUPABASE_URL: values.FOCUSOS_SUPABASE_URL!.trim(),
      FOCUSOS_SUPABASE_SERVICE_ROLE_KEY:
        values.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY!.trim(),
      FOCUSOS_USER_EMAIL: values.FOCUSOS_USER_EMAIL!.trim().toLowerCase(),
      FOCUSOS_AGENT_NAME: agentName as HermesEnv["FOCUSOS_AGENT_NAME"],
      FOCUSOS_DEFAULT_RUN_ID: values.FOCUSOS_DEFAULT_RUN_ID?.trim() || undefined,
      FOCUSOS_OBSIDIAN_VAULT_PATH:
        values.FOCUSOS_OBSIDIAN_VAULT_PATH?.trim() || undefined,
    },
  }
}

export function loadHermesEnv(envPath = ".env.hermes.local") {
  const absolutePath = path.resolve(process.cwd(), envPath)
  const fileValues = parseHermesEnvFile(readFileSync(absolutePath, "utf8"))
  return validateHermesEnv({ ...process.env, ...fileValues })
}
```

- [ ] **Step 4: Run passing tests**

Run:

```bash
npm test -- scripts/hermes-admin/env.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/hermes-admin/env.ts scripts/hermes-admin/env.test.mjs
git commit -m "feat: add Hermes local env loader"
```

---

### Task 5: Provenance And Audit Builders

**Files:**
- Create: `scripts/hermes-admin/provenance.ts`
- Create: `scripts/hermes-admin/provenance.test.mjs`

- [ ] **Step 1: Write tests**

Create `scripts/hermes-admin/provenance.test.mjs`:

```js
import test from "node:test"
import assert from "node:assert/strict"

const provenanceModule = await import("./provenance.ts")

test("buildProvenance returns contract fields", () => {
  const provenance = provenanceModule.buildProvenance({
    agentName: "Hermes",
    runId: "run-123",
    sourceKind: "gmail_sync",
    sourceRef: "message-1",
    confidence: 0.87649,
    updatedBy: "Hermes",
  })

  assert.deepEqual(provenance, {
    source_agent: "Hermes",
    source_run_id: "run-123",
    source_kind: "gmail_sync",
    source_ref: "message-1",
    created_by_agent: true,
    agent_confidence: 0.8765,
    updated_by: "Hermes",
  })
})

test("buildAgentEvent creates audit payload", () => {
  const event = provenanceModule.buildAgentEvent({
    userId: "user-1",
    agentName: "Hermes",
    runId: "run-123",
    eventType: "write",
    targetTable: "tasks",
    targetId: "00000000-0000-0000-0000-000000000001",
    action: "upsert_task",
    status: "success",
    summary: "Created task from Gmail",
    payload: { subject: "Tuition deadline" },
  })

  assert.equal(event.status, "success")
  assert.equal(event.action, "upsert_task")
  assert.equal(event.summary, "Created task from Gmail")
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- scripts/hermes-admin/provenance.test.mjs
```

Expected: FAIL because file missing.

- [ ] **Step 3: Implement provenance helper**

Create `scripts/hermes-admin/provenance.ts`:

```ts
type AgentName = "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"
type AgentEventStatus = "success" | "warning" | "failed"
type SourceKind =
  | "manual_user"
  | "hermes_direct"
  | "assistant_run"
  | "gmail_sync"
  | "calendar_sync"
  | "obsidian_import"
  | "youtube_intake"
  | "web_capture"
  | "system_rule"

type ProvenanceInput = {
  agentName: AgentName
  runId?: string | null
  sourceKind?: SourceKind | null
  sourceRef?: string | null
  confidence?: number | null
  updatedBy?: string | null
}

type AgentEventInput = {
  userId: string
  agentName: AgentName
  runId?: string | null
  eventType: string
  targetTable?: string | null
  targetId?: string | null
  action: string
  status?: AgentEventStatus
  summary?: string | null
  payload?: Record<string, unknown>
  errorText?: string | null
}

function clampConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return Math.min(1, Math.max(0, Number(value.toFixed(4))))
}

export function buildProvenance(input: ProvenanceInput) {
  return {
    source_agent: input.agentName,
    source_run_id: input.runId ?? null,
    source_kind: input.sourceKind ?? null,
    source_ref: input.sourceRef ?? null,
    created_by_agent: true,
    agent_confidence: clampConfidence(input.confidence),
    updated_by: input.updatedBy ?? input.agentName,
  }
}

export function buildAgentEvent(input: AgentEventInput) {
  return {
    user_id: input.userId,
    agent_name: input.agentName,
    run_id: input.runId ?? null,
    event_type: input.eventType,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    action: input.action,
    status: input.status ?? "success",
    summary: input.summary ?? null,
    payload: input.payload ?? {},
    error_text: input.errorText ?? null,
  }
}
```

- [ ] **Step 4: Run passing test**

Run:

```bash
npm test -- scripts/hermes-admin/provenance.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/hermes-admin/provenance.ts scripts/hermes-admin/provenance.test.mjs
git commit -m "feat: add Hermes provenance helpers"
```

---

### Task 6: Hermes Admin Client

**Files:**
- Create: `scripts/hermes-admin/client.ts`

- [ ] **Step 1: Create admin client**

Create `scripts/hermes-admin/client.ts`:

```ts
import { createClient } from "@supabase/supabase-js"
import type { HermesEnv } from "./env"

export function createHermesSupabaseAdmin(env: HermesEnv) {
  return createClient(
    env.FOCUSOS_SUPABASE_URL,
    env.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

export async function resolveUserIdByEmail(
  supabase: ReturnType<typeof createHermesSupabaseAdmin>,
  email: string,
) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) throw error

  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  )

  if (!user) {
    throw new Error(`No FocusOS user found for ${email}.`)
  }

  return user.id
}
```

- [ ] **Step 2: Run lint/build**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/hermes-admin/client.ts
git commit -m "feat: add Hermes admin client"
```

---

### Task 7: Hermes Write Helpers

**Files:**
- Create: `scripts/hermes-admin/writes.ts`

- [ ] **Step 1: Create write helpers**

Create `scripts/hermes-admin/writes.ts` with these exported helpers:

```ts
import { buildAgentEvent, buildProvenance } from "./provenance"
import type { createHermesSupabaseAdmin } from "./client"
import type { HermesEnv } from "./env"

type HermesSupabase = ReturnType<typeof createHermesSupabaseAdmin>
type Priority = "low" | "medium" | "high"
type SourceKind =
  | "manual_user"
  | "hermes_direct"
  | "assistant_run"
  | "gmail_sync"
  | "calendar_sync"
  | "obsidian_import"
  | "youtube_intake"
  | "web_capture"
  | "system_rule"

type WriteContext = {
  supabase: HermesSupabase
  userId: string
  agentName: HermesEnv["FOCUSOS_AGENT_NAME"]
  runId?: string | null
}

type ProvenanceInput = {
  sourceKind?: SourceKind | null
  sourceRef?: string | null
  confidence?: number | null
}

export async function logAgentEvent(
  context: WriteContext,
  input: {
    eventType: string
    targetTable?: string | null
    targetId?: string | null
    action: string
    status?: "success" | "warning" | "failed"
    summary?: string | null
    payload?: Record<string, unknown>
    errorText?: string | null
  },
) {
  const { error } = await context.supabase.from("agent_events").insert(
    buildAgentEvent({
      userId: context.userId,
      agentName: context.agentName,
      runId: context.runId,
      ...input,
    }),
  )

  if (error) throw error
}

export async function withAudit<T>(
  context: WriteContext,
  audit: {
    eventType: string
    action: string
    summary: string
    targetTable?: string | null
    targetId?: string | null
    payload?: Record<string, unknown>
  },
  actionFn: () => Promise<T>,
) {
  const result = await actionFn()
  await logAgentEvent(context, { status: "success", ...audit })
  return result
}

function provenance(context: WriteContext, input: ProvenanceInput) {
  return buildProvenance({
    agentName: context.agentName,
    runId: context.runId,
    sourceKind: input.sourceKind ?? "hermes_direct",
    sourceRef: input.sourceRef,
    confidence: input.confidence,
    updatedBy: context.agentName,
  })
}

export async function createCaptureIntake(
  context: WriteContext,
  input: ProvenanceInput & {
    captureId?: string | null
    intakeType: "task" | "event" | "obsidian_note" | "school_item" | "follow_up" | "finance_item" | "automation_idea" | "ignore" | "decision_needed"
    title?: string | null
    summary?: string | null
    sourceLink?: string | null
    tags?: string[]
    keyTakeaways?: unknown[]
    whatThisMeansForMe?: string | null
    obsidianTarget?: string | null
    decisionNeeded?: boolean
  },
) {
  const payload = {
    user_id: context.userId,
    capture_id: input.captureId ?? null,
    intake_type: input.intakeType,
    title: input.title ?? null,
    summary: input.summary ?? null,
    source_link: input.sourceLink ?? null,
    tags: input.tags ?? [],
    key_takeaways: input.keyTakeaways ?? [],
    what_this_means_for_me: input.whatThisMeansForMe ?? null,
    obsidian_target: input.obsidianTarget ?? null,
    decision_needed: input.decisionNeeded ?? false,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("capture_intake")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "capture_intake",
    targetId: data.id,
    action: "create_capture_intake",
    summary: `Created capture intake: ${input.title ?? input.intakeType}`,
    payload,
  })

  return data.id as string
}

export async function upsertTask(
  context: WriteContext,
  input: ProvenanceInput & {
    taskId?: string
    text: string
    priority?: Priority
    dueDate?: string | null
    category?: "work" | "personal" | "health" | "other" | null
    projectId?: string | null
    domainId?: string | null
    slipping?: boolean
  },
) {
  const payload = {
    user_id: context.userId,
    text: input.text,
    priority: input.priority ?? "medium",
    due_date: input.dueDate ?? null,
    category: input.category ?? "other",
    project_id: input.projectId ?? null,
    domain_id: input.domainId ?? null,
    slipping: input.slipping ?? false,
    ...provenance(context, input),
  }

  const query = input.taskId
    ? context.supabase.from("tasks").update(payload).eq("id", input.taskId).select("id").single()
    : context.supabase.from("tasks").insert(payload).select("id").single()

  const { data, error } = await query
  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "tasks",
    targetId: data.id,
    action: "upsert_task",
    summary: `Upserted task: ${input.text}`,
    payload,
  })

  return data.id as string
}

export async function writeBrief(
  context: WriteContext,
  input: ProvenanceInput & {
    summary: string
    topPriorities: string[]
    risks: string[]
    nextActions: string[]
    firstFocusBlock?: string | null
    focusNote?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    summary: input.summary,
    top_priorities: input.topPriorities,
    risks: input.risks,
    next_actions: input.nextActions,
    first_focus_block: input.firstFocusBlock ?? null,
    focus_note: input.focusNote ?? null,
    changed: true,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("assistant_briefs")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "assistant_briefs",
    targetId: data.id,
    action: "write_brief",
    summary: "Wrote assistant brief",
    payload,
  })

  return data.id as string
}

export async function writeBoardRecommendation(
  context: WriteContext,
  input: ProvenanceInput & {
    agentName: "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"
    title: string
    summary: string
    recommendationType: "priority" | "risk" | "decision" | "review" | "school" | "finance" | "systems" | "health"
    priority?: Priority
    domainId?: string | null
    projectId?: string | null
    supportingPoints?: unknown[]
    suggestedActions?: unknown[]
    expiresAt?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    agent_name: input.agentName,
    title: input.title,
    summary: input.summary,
    recommendation_type: input.recommendationType,
    priority: input.priority ?? "medium",
    supporting_points: input.supportingPoints ?? [],
    suggested_actions: input.suggestedActions ?? [],
    expires_at: input.expiresAt ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("board_recommendations")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "board_recommendations",
    targetId: data.id,
    action: "write_board_recommendation",
    summary: `Wrote board recommendation: ${input.title}`,
    payload,
  })

  return data.id as string
}

export async function logDecision(
  context: WriteContext,
  input: ProvenanceInput & {
    title: string
    description?: string | null
    status?: "open" | "decided" | "archived"
    urgency?: Priority
    recommendedOption?: string | null
    chosenOption?: string | null
    decideBy?: string | null
    domainId?: string | null
    projectId?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    urgency: input.urgency ?? "medium",
    recommended_option: input.recommendedOption ?? null,
    chosen_option: input.chosenOption ?? null,
    decide_by: input.decideBy ?? null,
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("decisions")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "decisions",
    targetId: data.id,
    action: "log_decision",
    summary: `Logged decision: ${input.title}`,
    payload,
  })

  return data.id as string
}

export async function createSchoolItem(
  context: WriteContext,
  input: ProvenanceInput & {
    courseCode?: string | null
    courseName?: string | null
    itemType: "class" | "exam" | "assignment" | "reading" | "study_block" | "admin" | "rotation" | "other"
    title: string
    description?: string | null
    status?: "open" | "done" | "archived"
    dueAt?: string | null
    startAt?: string | null
    priority?: Priority
    domainId?: string | null
    projectId?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    course_code: input.courseCode ?? null,
    course_name: input.courseName ?? null,
    item_type: input.itemType,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    due_at: input.dueAt ?? null,
    start_at: input.startAt ?? null,
    priority: input.priority ?? "medium",
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("school_items")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "school_items",
    targetId: data.id,
    action: "create_school_item",
    summary: `Created school item: ${input.title}`,
    payload,
  })

  return data.id as string
}
```

- [ ] **Step 2: Run lint/build**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/hermes-admin/writes.ts
git commit -m "feat: add Hermes MVP write helpers"
```

---

### Task 8: Hermes Admin README

**Files:**
- Create: `scripts/hermes-admin/README.md`

- [ ] **Step 1: Write README**

Create `scripts/hermes-admin/README.md`:

```md
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
- `resolveUserIdByEmail(email)`
- `logAgentEvent(input)`
- `withAudit(actionFn, auditPayload)`
- `createCaptureIntake(input)`
- `upsertTask(input)`
- `writeBrief(input)`
- `writeBoardRecommendation(input)`
- `logDecision(input)`
- `createSchoolItem(input)`

## Smoke Test

1. Apply `supabase/migrations/202606210001_hermes_foundation.sql`.
2. Create `.env.hermes.local`.
3. Load env with `loadHermesEnv()`.
4. Create Supabase admin client.
5. Resolve user id by `FOCUSOS_USER_EMAIL`.
6. Call `createCaptureIntake()`.
7. Confirm row exists in `capture_intake`.
8. Confirm row exists in `agent_events`.
9. Confirm FocusOS Operations page shows event.
```

- [ ] **Step 2: Confirm secret ignore**

Run:

```bash
git check-ignore .env.hermes.local .env.local
```

Expected: both paths printed.

- [ ] **Step 3: Commit**

```bash
git add scripts/hermes-admin/README.md
git commit -m "docs: add Hermes admin helper guide"
```

---

### Task 9: Agent Events Hook And Operations Page

**Files:**
- Create: `hooks/useAgentEvents.ts`
- Create: `app/operations/page.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Create hook**

Create `hooks/useAgentEvents.ts`:

```ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { AgentEvent } from "@/types"

export function useAgentEvents(userId?: string) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from("agent_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25)

    setEvents((data ?? []) as AgentEvent[])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`agent-events-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh, supabase, userId])

  return { events, loading, refresh }
}
```

- [ ] **Step 2: Create Operations page**

Create `app/operations/page.tsx`:

```tsx
"use client"

import { formatDistanceToNow } from "date-fns"
import { Activity, ShieldCheck } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { useAgentEvents } from "@/hooks/useAgentEvents"
import { useAuth } from "@/hooks/use-auth"

function formatRelative(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Unknown time"
  return formatDistanceToNow(parsed, { addSuffix: true })
}

export default function OperationsPage() {
  const { user } = useAuth()
  const { events, loading } = useAgentEvents(user?.id)

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        detail="Hermes admin activity, provenance, and realtime audit visibility."
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.4fr]">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white/55">
            <ShieldCheck className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Safety contract</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>Hermes secrets stay local-only on trusted PC.</p>
            <p>Browser UI keeps normal Supabase auth and RLS.</p>
            <p>Agent writes create audit events and provenance fields.</p>
            <p>Realtime keeps command surfaces fresh after Supabase changes.</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2 text-white/55">
            <Activity className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Recent agent events</span>
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <section key={event.id} className="rounded-lg border border-white/[0.07] bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {event.summary ?? event.action}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {event.agent_name} / {event.action} / {formatRelative(event.created_at)}
                    </p>
                  </div>
                  <Badge className="bg-white/[0.08] text-white/70">{event.status}</Badge>
                </div>
                {event.target_table ? (
                  <p className="mt-3 text-xs text-white/40">
                    {event.target_table}
                    {event.target_id ? ` / ${event.target_id}` : ""}
                  </p>
                ) : null}
              </section>
            ))}

            {!events.length && !loading ? (
              <section className="rounded-lg border border-dashed border-white/[0.12] p-8 text-sm text-white/45">
                No Hermes audit events yet.
              </section>
            ) : null}

            {loading ? (
              <section className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-sm text-white/45">
                Loading audit events...
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
```

- [ ] **Step 3: Add desktop Operations nav**

Modify `components/app-sidebar.tsx` import:

```ts
import {
  Activity,
  CalendarDays,
  CheckSquare,
  Flame,
  Inbox,
  LayoutDashboard,
  LogOut,
} from "lucide-react"
```

Modify `nav`:

```ts
const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/capture", label: "Inbox", icon: Inbox },
  { href: "/operations", label: "Operations", icon: Activity },
]
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS. Build route list includes `/operations`.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAgentEvents.ts app/operations/page.tsx components/app-sidebar.tsx
git commit -m "feat: add Hermes operations audit page"
```

---

### Task 10: README And Manual Supabase Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Hermes section**

Append to `README.md`:

```md
## Hermes Direct Supabase Admin

Hermes runs from a trusted local PC and writes directly to Supabase with a local-only admin secret.

Required safety contract:

- service role or secret key stays only on Hermes PC
- app UI uses normal Supabase auth and RLS
- helper writes insert `agent_events`
- helper writes populate provenance columns
- relevant tables are added to `supabase_realtime`

Apply this SQL in Supabase:

```bash
supabase/migrations/202606210001_hermes_foundation.sql
```

Hermes local env lives in `.env.hermes.local` on the Hermes PC. See `scripts/hermes-admin/README.md`.
```

- [ ] **Step 2: Full verification**

Run:

```bash
npm test
npm run lint
npm run build
git status --short
```

Expected:

- tests PASS
- lint PASS
- build PASS
- only intentional README change remains before commit

- [ ] **Step 3: Manual Supabase verification SQL**

After applying migration in Supabase SQL Editor, run:

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

Run:

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

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document Hermes Supabase admin setup"
```

---

## Realtime Subscription Map

- Hermes Command dashboard: `assistant_briefs`, `board_recommendations`, `decisions`, `projects`, `tasks`
- Capture Inbox: `captures`, `capture_intake`
- School: `school_items`
- Projects / Domains: `domains`, `projects`
- Audit / Admin: `agent_events`

All subscriptions filter by `user_id` where available.

## Final Acceptance Criteria

- `.env.hermes.local` remains local-only and ignored.
- `agent_events` exists and is append-only for normal UI.
- Provenance fields match Hermes contract.
- MVP tables match Hermes contract.
- `goals`, `review_entries`, and `slipping_items` are not in MVP migration.
- Realtime publication includes MVP tables.
- Helper exports match Hermes list.
- UI keeps normal auth/RLS and can read audit events.
- `npm test`, `npm run lint`, and `npm run build` pass.
