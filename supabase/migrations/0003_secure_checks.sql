-- Tighten what the public can read.
--
-- check_results rows contain raw error strings and response-body excerpts. The
-- public app only needs aggregate uptime, so raw rows become admin-only and the
-- aggregate views are made security-definer projections of safe data.

drop policy if exists "public reads checks" on public.check_results;

create policy "admins read checks" on public.check_results
  for select to authenticated using (public.is_admin());

revoke select on public.check_results from anon;

-- monitor_latest exposes raw errors; it is an internal view now.
revoke select on public.monitor_latest from anon;

-- Recompute uptime from stored checks without exposing the rows themselves.
alter view public.monitor_daily_stats set (security_invoker = false);
alter view public.service_daily_stats set (security_invoker = false);

-- service_daily_stats is a definer view; keep private services out of it so a
-- hidden service's uptime cannot be correlated by its id.
create or replace view public.service_daily_stats
with (security_invoker = false) as
select
  s.id as service_id,
  m.day,
  m.checks,
  m.ok_checks,
  m.avg_response_ms
from public.services s
join public.monitor_daily_stats m on m.monitor_id = s.monitor_id
where s.is_public;

grant select on public.monitor_daily_stats, public.service_daily_stats to anon, authenticated;
