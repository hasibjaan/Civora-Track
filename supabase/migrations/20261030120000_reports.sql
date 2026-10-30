-- Civora storage: one row per report, and a private bucket for report photos.
--
-- Run this once in the Supabase SQL editor, or with `supabase db push`. It is safe to run
-- again: every statement skips what already exists.
--
-- Only the app's server talks to Supabase, using the project's secret key, which acts as the
-- service_role. Browsers never do. So the table is closed to the public roles: row level
-- security is on with no policies, and anon and authenticated have no privileges at all.

create table if not exists public.reports (
  id text primary key
    constraint reports_id_format check (id ~ '^RPT-[0-9A-F]{4,12}$'),
  -- The whole report as JSON. The app validates it against ReportSchema on every read and write.
  report jsonb not null
    constraint reports_id_matches check (report ->> 'id' = id),
  -- Raised by the trigger below on every update. The app saves a change only if the version it
  -- read is still current, so two officers saving at once cannot overwrite each other.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reports is
  'Civora reports. Written only by the app server; the report column is validated by the app.';

create or replace function public.bump_report_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reports_bump_version on public.reports;
create trigger reports_bump_version
  before update on public.reports
  for each row execute function public.bump_report_version();

alter table public.reports enable row level security;
-- Start from nothing, since projects may grant every role all privileges on new tables. Then
-- give the server only what it uses. No delete: merged duplicates are kept and marked.
revoke all on table public.reports from anon, authenticated, service_role;
grant select, insert, update on table public.reports to service_role;
revoke execute on function public.bump_report_version() from public, anon, authenticated;

-- Photos: a private bucket, so there is no public link to any file. Storage itself enforces the
-- same size limit and image types that the app checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
