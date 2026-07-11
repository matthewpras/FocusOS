create extension if not exists "pgcrypto";

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  category text check (category in ('work','personal','health','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at_column();
alter table tasks enable row level security;
create policy "own tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_tasks_user_due on tasks (user_id, due_date);

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '✓',
  color text not null default '#60A5FA',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger habits_updated_at before update on habits for each row execute function update_updated_at_column();
alter table habits enable row level security;
create policy "own habits" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  logged_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table habit_logs enable row level security;
create policy "own habit_logs" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create unique index idx_habit_logs_unique on habit_logs (habit_id, logged_date);
create index idx_habit_logs_user_date on habit_logs (user_id, logged_date desc);

create table captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  converted boolean not null default false,
  created_at timestamptz not null default now()
);
alter table captures enable row level security;
create policy "own captures" on captures for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_captures_user on captures (user_id, converted, created_at desc);

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
alter table captures add column if not exists obsidian_export_status text check (obsidian_export_status in ('pending','exported','fallback','failed'));
alter table captures add column if not exists obsidian_exported_at timestamptz;
alter table captures add column if not exists obsidian_export_path text;
create unique index if not exists idx_captures_user_assistant_key on captures (user_id, assistant_key) where assistant_key is not null;
create index if not exists idx_captures_user_obsidian_export on captures (user_id, obsidian_export_status, obsidian_exported_at desc);

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
create trigger external_commitments_updated_at before update on external_commitments for each row execute function update_updated_at_column();
alter table external_commitments enable row level security;
create policy "own external_commitments" on external_commitments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
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
create policy "own assistant_runs" on assistant_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
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
create policy "own assistant_briefs" on assistant_briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
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
create trigger assistant_source_states_updated_at before update on assistant_source_states for each row execute function update_updated_at_column();
alter table assistant_source_states enable row level security;
create policy "own assistant_source_states" on assistant_source_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

revoke execute on function update_updated_at_column() from anon, authenticated;
revoke execute on function create_updated_at_trigger(regclass, text) from anon, authenticated;
revoke execute on function add_provenance_columns(text) from anon, authenticated;

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
  raw_note text,
  links jsonb not null default '[]'::jsonb,
  media_items jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  agent_status text not null default 'queued' check (agent_status in ('queued','processing','analyzed','synced','failed')),
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
create index if not exists idx_capture_intake_user_agent_status on capture_intake (user_id, agent_status, created_at desc);

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

grant select, insert, update, delete on table
  public.domains,
  public.projects,
  public.decisions,
  public.school_items,
  public.capture_intake,
  public.board_recommendations
to authenticated;

grant select on table public.agent_events to authenticated;

grant select, insert, update, delete on table
  public.domains,
  public.projects,
  public.decisions,
  public.school_items,
  public.capture_intake,
  public.board_recommendations,
  public.agent_events
to service_role;

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
