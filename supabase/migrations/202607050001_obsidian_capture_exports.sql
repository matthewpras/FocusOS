alter table captures add column if not exists obsidian_export_status text check (obsidian_export_status in ('pending','exported','fallback','failed'));
alter table captures add column if not exists obsidian_exported_at timestamptz;
alter table captures add column if not exists obsidian_export_path text;

create index if not exists idx_captures_user_obsidian_export
  on captures (user_id, obsidian_export_status, obsidian_exported_at desc);
