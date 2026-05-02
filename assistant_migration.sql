create extension if not exists "pgcrypto";

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

alter table tasks add column if not exists assistant_key text;
alter table tasks add column if not exists assistant_source text;
alter table tasks add column if not exists created_by_assistant boolean not null default false;
create unique index if not exists idx_tasks_user_assistant_key on tasks (user_id, assistant_key) where assistant_key is not null;

alter table habits add column if not exists assistant_key text;
alter table habits add column if not exists assistant_source text;
alter table habits add column if not exists created_by_assistant boolean not null default false;
create unique index if not exists idx_habits_user_assistant_key on habits (user_id, assistant_key) where assistant_key is not null;

alter table captures add column if not exists assistant_key text;
alter table captures add column if not exists assistant_source text;
alter table captures add column if not exists created_by_assistant boolean not null default false;
create unique index if not exists idx_captures_user_assistant_key on captures (user_id, assistant_key) where assistant_key is not null;

create table if not exists external_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('google_calendar', 'gmail')),
  source_id text not null,
  title text not null,
  details text,
  starts_at timestamptz,
  due_date date,
  confidence numeric(4,3) not null default 0.5,
  action_hint text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'external_commitments_updated_at'
  ) then
    create trigger external_commitments_updated_at
    before update on external_commitments
    for each row execute function update_updated_at_column();
  end if;
end $$;

alter table external_commitments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'external_commitments'
      and policyname = 'own external_commitments'
  ) then
    create policy "own external_commitments"
    on external_commitments
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_external_commitments_user_source on external_commitments (user_id, source, due_date, starts_at);

create table if not exists assistant_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('success', 'no_change', 'partial_failure', 'failed')),
  trigger_source text not null check (trigger_source in ('manual', 'cron')),
  summary text,
  changes jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table assistant_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'assistant_runs'
      and policyname = 'own assistant_runs'
  ) then
    create policy "own assistant_runs"
    on assistant_runs
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_assistant_runs_user_started on assistant_runs (user_id, started_at desc);

create table if not exists assistant_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references assistant_runs(id) on delete set null,
  summary text not null,
  top_priorities jsonb not null default '[]'::jsonb,
  first_focus_block text,
  risks jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  focus_note text,
  changed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table assistant_briefs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'assistant_briefs'
      and policyname = 'own assistant_briefs'
  ) then
    create policy "own assistant_briefs"
    on assistant_briefs
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_assistant_briefs_user_created on assistant_briefs (user_id, created_at desc);

create table if not exists assistant_source_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calendar_last_synced_at timestamptz,
  gmail_last_synced_at timestamptz,
  last_successful_run_at timestamptz,
  last_attempted_run_at timestamptz,
  next_suggested_run_at timestamptz,
  status text not null default 'idle' check (status in ('idle', 'success', 'no_change', 'partial_failure', 'failed')),
  error_text text,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'assistant_source_states_updated_at'
  ) then
    create trigger assistant_source_states_updated_at
    before update on assistant_source_states
    for each row execute function update_updated_at_column();
  end if;
end $$;

alter table assistant_source_states enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'assistant_source_states'
      and policyname = 'own assistant_source_states'
  ) then
    create policy "own assistant_source_states"
    on assistant_source_states
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;
