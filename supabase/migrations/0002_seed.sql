-- Seed the FastHand service catalogue.
-- Only the verified data-center heartbeat is enabled. Every other service is
-- intentionally left without a monitor so the page reports "No automated check"
-- instead of implying health we have not measured.

insert into public.service_groups (id, name, slug, description, sort_order) values
  ('11111111-1111-4111-8111-111111111111', 'Core Infrastructure', 'core-infrastructure',
   'The shared backbone that every FastHand product depends on.', 10),
  ('22222222-2222-4222-8222-222222222222', 'Seller Platform', 'seller-platform',
   'Tools used by market and shop owners to run their business.', 20),
  ('33333333-3333-4333-8333-333333333333', 'Identity & Data', 'identity-and-data',
   'Sign-in, accounts, and the systems that store FastHand records.', 30),
  ('44444444-4444-4444-8444-444444444444', 'Web Presence', 'web-presence',
   'Public websites and landing pages.', 40)
on conflict (slug) do nothing;

insert into public.monitors (
  id, name, url, method, expected_status_min, expected_status_max, expected_text,
  timeout_ms, check_interval_seconds, failure_threshold, recovery_threshold, enabled
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'Data Center heartbeat',
  'https://fasthanddatacenter.fasthandstudio.asia/isitonline',
  'GET', 200, 299, 'Hey bro iam online',
  10000, 300, 3, 3, true
)
on conflict (url) do nothing;

insert into public.services (
  id, group_id, monitor_id, name, slug, description, is_public, sort_order
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '11111111-1111-4111-8111-111111111111',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Data Center', 'data-center',
   'Physical data center and network edge serving FastHand workloads.', true, 10),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', '11111111-1111-4111-8111-111111111111',
   null, 'Public API', 'public-api',
   'Shared HTTP API used by the rider and seller applications. No verified health endpoint yet.',
   true, 20),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', '22222222-2222-4222-8222-222222222222',
   null, 'Seller Panel', 'seller-panel',
   'Web panel where sellers manage catalog, orders, and payouts. No verified health endpoint yet.',
   true, 10),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04', '33333333-3333-4333-8333-333333333333',
   null, 'Authentication', 'authentication',
   'Sign-in and session services for FastHand accounts. No verified health endpoint yet.',
   true, 10),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05', '33333333-3333-4333-8333-333333333333',
   null, 'Database', 'database',
   'Primary Postgres database. No safe external health endpoint yet.', true, 20),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa06', '44444444-4444-4444-8444-444444444444',
   null, 'FastHand Studio website', 'website',
   'Public studio site. No verified health endpoint yet.', true, 10)
on conflict (slug) do nothing;
