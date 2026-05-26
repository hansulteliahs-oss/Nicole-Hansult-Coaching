-- Phase 3: submissions backup table for contact + lead-magnet forms
create table if not exists submissions (
  id          uuid        primary key default gen_random_uuid(),
  form_type   text        not null check (form_type in ('contact', 'lead_magnet')),
  email       text        not null,
  data        jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

-- Enable RLS (inserts use service role key which bypasses RLS; ready for Phase 4 auth policies)
alter table submissions enable row level security;
