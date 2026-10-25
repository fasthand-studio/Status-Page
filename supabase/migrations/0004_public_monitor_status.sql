-- Fix public monitor status after raw check rows became admin-only.
--
-- monitor_status is a security-definer view, but it joined monitor_latest,
-- which is security_invoker. The nested view therefore ran with the caller's
-- privileges and the public lost access when 0003 revoked check_results.
-- Read the latest check inline instead of through the nested view.

create or replace view public.monitor_status
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
left join lateral (
  select
    c.checked_at,
    c.ok,
    c.status_code,
    c.response_time_ms
  from public.check_results c
  where c.monitor_id = m.id
  order by c.checked_at desc
  limit 1
) l on true;

grant select on public.monitor_status to anon, authenticated;

comment on view public.monitor_status is
  'Public-safe monitor metadata. Security definer by design; no URLs or error bodies.';
