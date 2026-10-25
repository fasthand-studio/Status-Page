-- FastHand Status — core schema, row level security, and public read views.
-- Run through the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

create type public.incident_status as enum ('investigating', 'identified', 'monitoring', 'resolved');
create type public.incident_impact as enum ('none', 'minor', 'major', 'critical');
create type public.maintenance_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.service_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  method text not null default 'GET' check (method in ('GET', 'HEAD')),
  expected_status_min integer not null default 200 check (expected_status_min between 100 and 599),
  expected_status_max integer not null default 299 check (expected_status_max between 100 and 599),
  expected_text text,
  timeout_ms integer not null default 10000 check (timeout_ms between 1000 and 60000),
  check_interval_seconds integer not null default 300 check (check_interval_seconds between 60 and 86400),
  failure_threshold integer not null default 3 check (failure_threshold between 1 and 12),
  recovery_threshold integer not null default 3 check (recovery_threshold between 1 and 12),
  incident_impact public.incident_impact not null default 'major',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitors_status_range check (expected_status_min <= expected_status_max)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.service_groups(id) on delete restrict,
  monitor_id uuid references public.monitors(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.check_results (
  id bigint generated always as identity primary key,
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  status_code integer,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  error text,
  body_excerpt text
);

create index check_results_monitor_time_idx on public.check_results (monitor_id, checked_at desc);
create index check_results_time_idx on public.check_results (checked_at desc);

create table public.monitor_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checks_run integer not null default 0,
  failures integer not null default 0,
  source text not null default 'github-actions'
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status public.incident_status not null default 'investigating',
  impact public.incident_impact not null default 'minor',
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  auto_detected boolean not null default false,
  monitor_id uuid references public.monitors(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_open_idx on public.incidents (started_at desc) where resolved_at is null;
create index incidents_resolved_idx on public.incidents (resolved_at desc) where resolved_at is not null;

-- One automated incident per monitor at a time. Manual incidents are unaffected.
create unique index incidents_one_open_auto_per_monitor
  on public.incidents (monitor_id)
  where resolved_at is null and auto_detected = true;

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status public.incident_status not null,
  body text not null,
  author text not null default 'FastHand Team',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index incident_updates_incident_idx on public.incident_updates (incident_id, created_at asc);

create table public.incident_services (
  incident_id uuid not null references public.incidents(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (incident_id, service_id)
);

create table public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  status public.maintenance_status not null default 'scheduled',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_window_order check (scheduled_end > scheduled_start)
);

create table public.maintenance_services (
  maintenance_id uuid not null references public.maintenance_windows(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (maintenance_id, service_id)
);

-- Admin allowlist. There is deliberately no insert/update policy: admins are
-- granted with the service role only (scripts/grant-admin.ts).
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger monitors_touch before update on public.monitors
  for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
create trigger incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();
create trigger maintenance_touch before update on public.maintenance_windows
  for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.service_groups enable row level security;
alter table public.monitors enable row level security;
alter table public.services enable row level security;
alter table public.check_results enable row level security;
alter table public.monitor_runs enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;
alter table public.incident_services enable row level security;
alter table public.maintenance_windows enable row level security;
alter table public.maintenance_services enable row level security;
alter table public.admin_users enable row level security;

-- Public read (everything the status page renders is public by design).
create policy "public reads groups" on public.service_groups
  for select to anon, authenticated using (true);
create policy "public reads public services" on public.services
  for select to anon, authenticated using (is_public or public.is_admin());
create policy "public reads checks" on public.check_results
  for select to anon, authenticated using (true);
create policy "public reads runs" on public.monitor_runs
  for select to anon, authenticated using (true);
create policy "public reads incidents" on public.incidents
  for select to anon, authenticated using (true);
create policy "public reads incident updates" on public.incident_updates
  for select to anon, authenticated using (true);
create policy "public reads incident services" on public.incident_services
  for select to anon, authenticated using (true);
create policy "public reads maintenance" on public.maintenance_windows
  for select to anon, authenticated using (true);
create policy "public reads maintenance services" on public.maintenance_services
  for select to anon, authenticated using (true);

-- Monitor URLs are not public. Only admins may read the table directly; the
-- public gets a narrow view below.
create policy "admins read monitors" on public.monitors
  for select to authenticated using (public.is_admin());

-- Admin writes. Check results and runs are written by the service role only.
create policy "admins manage groups" on public.service_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage services" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage monitors" on public.monitors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage incidents" on public.incidents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage incident updates" on public.incident_updates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage incident services" on public.incident_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage maintenance" on public.maintenance_windows
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage maintenance services" on public.maintenance_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins read themselves" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.service_groups, public.services, public.check_results,
  public.monitor_runs, public.incidents, public.incident_updates,
  public.incident_services, public.maintenance_windows, public.maintenance_services
  to anon, authenticated;

grant insert, update, delete on public.service_groups, public.services, public.monitors,
  public.incidents, public.incident_updates, public.incident_services,
  public.maintenance_windows, public.maintenance_services
  to authenticated;

grant select on public.monitors to authenticated;
grant select on public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- Views (read-only projections used by the app)
-- ---------------------------------------------------------------------------

create view public.monitor_latest
with (security_invoker = true) as
select distinct on (monitor_id)
  monitor_id,
  checked_at,
  ok,
  status_code,
  response_time_ms,
  error
from public.check_results
order by monitor_id, checked_at desc;

create view public.monitor_daily_stats
with (security_invoker = true) as
select
  monitor_id,
  (checked_at at time zone 'utc')::date as day,
  count(*)::integer as checks,
  count(*) filter (where ok)::integer as ok_checks,
  round(avg(response_time_ms))::integer as avg_response_ms
from public.check_results
group by 1, 2;

create view public.service_daily_stats
with (security_invoker = true) as
select
  s.id as service_id,
  m.day,
  m.checks,
  m.ok_checks,
  m.avg_response_ms
from public.services s
join public.monitor_daily_stats m on m.monitor_id = s.monitor_id;

-- Deliberate security-definer view: it exposes only safe monitor metadata and
-- never the URL, expected body, or raw error.
create view public.monitor_status
with (security_invoker = false) as
select
  m.id,
  m.name,
  m.enabled,
  m.check_interval_seconds,
  l.checked_at,
  l.ok,
  l.status_code,
  l.response_time_ms
from public.monitors m
left join public.monitor_latest l on l.monitor_id = m.id;

grant select on public.monitor_latest, public.monitor_daily_stats,
  public.service_daily_stats, public.monitor_status
  to anon, authenticated;

comment on view public.monitor_status is
  'Public-safe monitor metadata. Security definer by design; no URLs or error bodies.';
