alter table capture_intake add column if not exists raw_note text;
alter table capture_intake add column if not exists links jsonb not null default '[]'::jsonb;
alter table capture_intake add column if not exists media_items jsonb not null default '[]'::jsonb;
alter table capture_intake add column if not exists payload jsonb not null default '{}'::jsonb;
alter table capture_intake add column if not exists agent_status text not null default 'queued';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'capture_intake_agent_status_check'
      and conrelid = 'capture_intake'::regclass
  ) then
    alter table capture_intake
      add constraint capture_intake_agent_status_check
      check (agent_status in ('queued','processing','analyzed','synced','failed'));
  end if;
end $$;

create index if not exists idx_capture_intake_user_agent_status
  on capture_intake (user_id, agent_status, created_at desc);
