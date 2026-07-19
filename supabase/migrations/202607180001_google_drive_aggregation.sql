alter table external_commitments drop constraint if exists external_commitments_source_check;
alter table external_commitments
  add constraint external_commitments_source_check
  check (source in ('google_calendar', 'gmail', 'google_drive'));

alter table assistant_source_states add column if not exists drive_last_synced_at timestamptz;
