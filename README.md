# FastHand Status

A standalone status page and operations desk for FastHand, modelled on the shape of
[cloudflarestatus.com/services](https://www.cloudflarestatus.com/services) but built around FastHand's own
branding and an honest data contract:

- **Uptime comes from stored checks, not from a hand-written number.**
- A service with no verified monitor is **No check**, never green.
- A monitor whose last check is late is **Unknown**, never assumed recovered.
- Automated incidents require sustained failures and never duplicate each other.
- Incidents and maintenance notices are written in **Markdown** by an authenticated admin.

Stack: Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase Postgres + Auth + RLS ·
Supabase pg_cron + pg_net for scheduling · Vercel. No Docker or local Supabase container is required.
The ops desk can draft incident copy with Groq; drafts stay in the form until you publish them.

---

## What is in the box

| Surface | Route | Notes |
| --- | --- | --- |
| Status home | `/` | Overall state, active incidents, service groups, 30-day bars, maintenance |
| Services | `/services` | Searchable/collapsible groups, 7/30/90-day uptime, 90-day bars |
| Incident history | `/incidents`, `/incidents/[id]` | Markdown timeline, impact, affected services |
| Maintenance | `/maintenance` | Scheduled, active, and past windows |
| Archive | `/history` | Resolved incidents by month, maintenance archive |
| Admin sign in | `/admin/login` | Supabase email/password, allowlist enforced |
| Ops desk | `/admin` | Overview, incidents, services, monitors, maintenance |

The admin area is `noindex`, protected by middleware, re-checked in every server action, and backed by Row
Level Security.

### Drafting incident copy

The incident forms have a **Draft the copy** box: describe the problem the way you would tell a colleague and
Groq turns it into a title and a customer-facing update.

- Requires `GROQ` in the environment. Without it the box is not rendered — there is no button that does nothing.
- `POST /api/incident-draft` verifies the Supabase session **and** the `admin_users` allowlist before it calls
  Groq, and maps provider failures (bad key, rate limit, timeout) to readable messages.
- It writes into the form fields and never publishes. You stay responsible for the wording.
- It only sees your notes plus the status, impact, and service names you picked. It never reads check data,
  so it cannot invent a cause your notes do not contain — and the prompt forbids it anyway.

---

## 1. What I need from Supabase

You only need a **cloud Supabase project**. No local stack, CLI daemon, or Docker.

1. **Project URL** — `https://<project-ref>.supabase.co` (Project Settings → API).
2. **Anon / publishable key** — Project Settings → API. This is public by design; RLS still applies.
3. **Service-role key** — same page. Server-only. Never put it in a `NEXT_PUBLIC_` variable.
4. **Apply the migrations, in order**, in the SQL editor (SQL Editor → New query → paste → Run):
   1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, enums, triggers,
      RLS policies, views.
   2. [`supabase/migrations/0002_seed.sql`](supabase/migrations/0002_seed.sql) — four groups, six services,
      the one verified monitor.
   3. [`supabase/migrations/0003_secure_checks.sql`](supabase/migrations/0003_secure_checks.sql) — makes raw
      check rows admin-only and moves public uptime onto aggregate views.
   4. [`supabase/migrations/0004_public_monitor_status.sql`](supabase/migrations/0004_public_monitor_status.sql) —
      keeps the public monitor-status view readable after raw checks became admin-only.
5. **Create the admin user** — Authentication → Users → **Add user** → email + password. If you create it
   with email confirmation, confirm it (or use “Auto Confirm User”).
6. **Grant the allowlist row** — with the service-role key in `.env.local`:
   ```bash
   npm run grant-admin -- you@example.com
   ```
   Creating an auth user is not enough; `admin_users` is a separate allowlist with no public write policy.
7. **Auth URL settings** — Authentication → URL Configuration: set **Site URL** to the production URL
   (for example `https://status.fasthandstudio.asia`). Password sign-in does not need email redirects.
8. **Vercel environment variables** — Project → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (used by “Run check now” and by `POST /api/checks/run`)
   - `NEXT_PUBLIC_SITE_URL`
   - `GROQ` — optional. Your Groq API key. Without it the ops desk simply has no draft button.

That is the complete list. You do not need to create tables by hand; the migrations do it.

---

## 2. Local setup

```bash
cp .env.example .env.local
# fill in the four values from step 1
npm install
npm run dev
```

Open `http://localhost:3000`. Until Supabase is configured the public page renders a setup state instead of
inventing uptime, and `/admin/login` lists the missing variables.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Node test runner over `tests/*.test.ts` |
| `npm run checks` | Run all enabled monitors once and store results |
| `npm run grant-admin -- <email>` | Add an auth user to the admin allowlist |
| `npm run grant-admin -- --list` | Show granted admins |
| `npm run grant-admin -- --revoke <email>` | Remove admin access (auth user remains) |

---

## 3. Checks and automation

Supabase drives the schedule through `POST /api/checks/run`. Every run — scheduled or `npm run checks` — does
this:

1. Inserts a `monitor_runs` row (`source = pg-cron` for scheduled runs, `manual` for `npm run checks`).
2. Loads every **enabled** monitor.
3. Performs the HTTP request: expected status range, optional expected phrase (whitespace-normalised),
   timeout, redirects followed.
4. Stores the result in `check_results` — status code, response time, timestamp, error, and a short body
   excerpt only on failure.
5. Evaluates automation:
   - Opens an incident after `failure_threshold` consecutive failures (default 3), unless another incident
     is already open for that monitor.
   - Resolves the automated incident after `recovery_threshold` consecutive passes (default 3), adding a
     closing update.
   - A partial unique index (`incidents_one_open_auto_per_monitor`) makes duplicate auto-incidents
     impossible even if two runs overlap.
6. Prunes checks older than `CHECK_RETENTION_DAYS` (default 120).
7. Closes the run row with counts.

A failing endpoint is **data**, so the run still reports success. A database write failure or an internal
error exits non-zero and, for scheduled runs, shows up as an unanswered call.

The public page uses `max(3 × interval, 15 min)` as the staleness window and shows **Unknown** once evidence
is late.

### Scheduling the checks with pg_cron

There is no second scheduler. GitHub Actions was removed as a check runner on 2026-10-26: its schedule fired
three times in six hours while pg_cron held the five-minute cadence, and two runners writing overlapping runs
made the history harder to read.

1. Store the service-role key in **Supabase Vault** as `status_service_key`.
2. Enable `pg_cron` and `pg_net` in **Database → Extensions**.
3. Run this once in the SQL editor (replace the URL with the deployment):

```sql
select cron.schedule(
  'fasthand-status-checks',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://status-page-wheat-nine.vercel.app/api/checks/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'status_service_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

Check it is alive:

```sql
select jobname, last_run_at, result, jobstatus
from cron.job_run_details
where jobname = 'fasthand-status-checks'
order by start_time desc
limit 5;
```

Remove it with `select cron.unschedule('fasthand-status-checks');`. `POST /api/checks/run` authenticates the
caller with the service-role key as a bearer token and is the only endpoint pg_cron needs.

---

## 4. Adding monitors (the rule that keeps the page honest)

Only attach a monitor to a service when you have **verified that the endpoint reflects that service's
health**. `HTTP 200` from a marketing page does not prove the database is up.

For each new service:

1. Confirm a health route that returns a distinct, stable signal (status, phrase, or both).
2. `/admin/monitors/new` → name, URL, expected range, expected phrase, timeout.
3. Use **Run check now** and confirm the stored result is what you expect.
4. `/admin/services/[id]` → attach the monitor.
5. Watch the next scheduled run.

The seeded monitor is the data-center heartbeat:

```text
https://fasthanddatacenter.fasthandstudio.asia/isitonline
expected: HTTP 2xx and the phrase "Hey bro iam online"
```

The seller panel, public API, authentication, and database services currently have **no monitor**, so they
render as **No check**. Add them only when their health endpoints exist and have been verified.

---

## 5. Uptime math

- Uptime is `ok_checks / checks` for the requested UTC day window (7/30/90).
- Days with no checks are grey and contribute **nothing** — they are not counted as 100%.
- Percentages are truncated, never rounded up: `99.999%` displays `99.99%`, not `100%`.
- Raw rows are admin-only after migration `0003`; the public uses aggregate views.
- The overall banner says “All monitored systems operational”, not “everything is fine”, because coverage is
  usually partial.

---

## 6. Deploying to Vercel

1. Import `fasthand-studio/Status-Page` in Vercel.
2. Framework preset: **Next.js**. Build command `npm run build`, output handled automatically.
3. Add the environment variables from step 1 for Production, Preview, and Development as appropriate.
4. Deploy, then set the Supabase **Site URL** to the final domain.
5. Point the pg_cron job at the deployed URL and confirm `monitor_runs.source = pg-cron` rows appear.
6. Deployment Protection: if **Vercel Authentication** is enabled, `*.vercel.app` URLs return a login page.
   Either turn it off for this project or attach the real status domain (custom domains are excluded by the
   `all_except_custom_domains` setting).
7. Push is not automatically a deployment unless the Vercel project is connected to this repository; check
   the Vercel dashboard after the first push.

No Docker, no `supabase start`, no local Postgres.

---

## 7. Security model

- **Allowlist, not “any signed-in user”.** Every admin route and server action calls `getAdminContext()`,
  which verifies both the Supabase session and an `admin_users` row.
- **RLS on every table.** Public reads are limited to public status data; writes require `is_admin()`
  (`security definer`, fixed `search_path`). `admin_users` has no insert/update/delete policy; it is
  bootstrapped with the service role.
- **Raw check rows are private.** Monitor URLs, raw errors, and body excerpts are admin-only. The public
  reads `monitor_status`, a `security definer` view exposing only status/timing, and aggregate daily stats.
- **Secrets stay server-side.** `SUPABASE_SERVICE_ROLE_KEY` is used by the runner, the bootstrap script, and
  “Run check now”; it is never exposed to the browser.
- **Markdown is rendered without raw HTML** (`react-markdown`), so admins cannot inject scripts into public
  pages.
- **Middleware** refreshes the Supabase session on `/admin/*` and redirects unauthenticated visitors to the
  login page.
- **No dead auth UI.** There is no self-service sign-up, password reset, or fake social login on the admin
  page.

Operational security limits: admin sign-in is password-based (enable MFA in Supabase if you need it); the
public status page is rate-limited only by Vercel/Supabase; and there is no audit log beyond row timestamps
and update authors.

---

## 8. Project layout

```text
app/(public)/          Public status, services, incidents, maintenance, history
app/admin/             Login + protected ops desk routes and server actions
app/api/               pg_cron check trigger and the admin-only draft writer
components/            Public UI, admin UI, Markdown renderer
lib/                   Types, queries, auth, status math, checks, automation, validation
supabase/migrations/   Schema, seed, security hardening
scripts/               Check runner and admin allowlist CLI
tests/                 Pure-function tests for status math, checks, automation, validation
.github/workflows/     CI only (typecheck, test, build)
docs/RUNBOOK.md        What to do during an incident or when the runner stops
```

---

## 9. Verification

```bash
npm run typecheck
npm test
npm run build
```

The tests cover the parts that must not lie: stale detection, incident thresholds, duplicate-incident
guards, uptime truncation, check parsing, UTC date handling, and the draft writer's prompt shape, output
limits, and failure codes.

---

## 10. Deliberate limitations

- **No fabricated demo history.** A fresh database shows empty bars and **Waiting for the first check** until
  the cron job has run.
- **No email/SMS subscribers yet.** The page does not show a subscribe form that does nothing.
- **No per-service public pages.** Service details live in the directory and group rows.
- **Five-minute cadence, not a pager.** Scheduling stops if the Vercel deployment is unreachable or the
  pg_cron job is dropped; sustained outages are detected after the failure threshold, not instantly.
- **Drafts are not truth.** The Groq writer only turns what you tell it into customer-facing prose. It never
  sees check data, cannot publish, and its output goes into the form for you to correct first.
