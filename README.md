# FastHand Status

A public status page and an internal operations desk for FastHand, shaped like
[cloudflarestatus.com/services](https://www.cloudflarestatus.com/services) and built on one rule: **the page only
says what the stored checks actually prove.**

- Live site: **https://status.fasthandstudio.asia**
- Ops desk: **`/admin` on whatever domain you deploy to** — the examples below write it as
  **https://example.com/admin**, and only people on the `admin_users` allowlist may use it
- Repository: `fasthand-studio/Status-Page` · deploys from `main`
- Day-to-day incident steps live in [docs/RUNBOOK.md](docs/RUNBOOK.md)

### The data contract

| Situation | What the page says |
| --- | --- |
| Service has no monitor | **No check** — never green, never counted as healthy |
| Last check is older than `max(3 × interval, 15 min)` | **Unknown** — never assumed recovered |
| A day with no checks at all | Grey bar, contributes **nothing** to the uptime percentage |
| Uptime is 99.999% | Displays **99.99%** — percentages are truncated, never rounded up |
| Fresh database | Empty bars and *Waiting for the first check* — no fabricated history |

Stack: Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Supabase Postgres + Auth + RLS ·
Supabase `pg_cron` + `pg_net` for scheduling · Vercel. Optional Groq draft writer for customer-facing copy.
There is no Docker, no local Postgres, and no Supabase CLI daemon in this project.

---

## Contents

1. [What you get](#1-what-you-get)
2. [How it works](#2-how-it-works)
3. [Requirements](#3-requirements)
4. [Setup](#4-setup)
5. [Scheduling the checks with pg_cron](#5-scheduling-the-checks-with-pg_cron)
6. [Deploying to Vercel](#6-deploying-to-vercel)
7. [Using the ops desk](#7-using-the-ops-desk)
8. [Health states and uptime math](#8-health-states-and-uptime-math)
9. [Configuration reference](#9-configuration-reference)
10. [Scripts and commands](#10-scripts-and-commands)
11. [Security model](#11-security-model)
12. [Verification after any change](#12-verification-after-any-change)
13. [Troubleshooting](#13-troubleshooting)
14. [Project layout](#14-project-layout)
15. [Deliberate limitations](#15-deliberate-limitations)

---

## 1. What you get

### Public pages (no sign-in)

| Route | Shows |
| --- | --- |
| `/` | Overall banner, active incidents, active maintenance, every service group with 30-day bars |
| `/services` | Searchable, collapsible groups with 7/30/90-day uptime and 90-day bars |
| `/incidents`, `/incidents/[id]` | Incident list and the Markdown timeline of one incident |
| `/maintenance` | Scheduled, active, and past windows |
| `/history` | Resolved incidents grouped by month, plus the maintenance archive |

### Ops desk (`/admin`)

| Route | Use it for |
| --- | --- |
| `/admin/login` | Supabase email + password, then an `admin_users` allowlist check |
| `/admin` | Overview: overall state, needs-attention list, runner health (last runs, freshness) |
| `/admin/incidents` | Open incidents, recent resolutions, publish and update |
| `/admin/services` | The service inventory, monitor attachment, public visibility, ordering |
| `/admin/groups` | The headings the public page files services under |
| `/admin/monitors` | Checks: URL, expected status and phrase, cadence, thresholds, results |
| `/admin/maintenance` | Maintenance windows and their status |

The admin area is `noindex`, gated by middleware, re-checked inside every server action, and backed by Row Level
Security. There is no self-service sign-up, password reset, or fake social login — those would be dead UI.

---

## 2. How it works

```
Supabase pg_cron + pg_net  ──every 5 min──▶  POST /api/checks/run
                                                     │
                                                     ▼
                             checks every enabled monitor ──▶ check_results
                                                     │                 │
                                                     ▼                 ▼
                       automation: open / update / resolve incidents   monitor_status view
                                                     │
                                                     ▼
                          Next.js pages (server components, RLS reads)
```

1. A scheduler calls `POST /api/checks/run` with the Supabase service-role key as a bearer token. Each run writes
   a `monitor_runs` row (`source = 'pg-cron'` for scheduled runs, `'manual'` for `npm run checks`).
2. The runner performs one HTTP request per **enabled** monitor: method, expected status range, optional expected
   phrase (whitespace-normalised), timeout, and self-followed redirects.
3. Each result is stored in `check_results` — status code, response time, timestamp, error, and a 280-character
   body excerpt **only on failure**.
4. Automation then opens an incident after `failure_threshold` consecutive failures, posts nothing further on its
   own, and closes the incident after `recovery_threshold` consecutive passes with a closing update authored by
   *Automated monitoring*. A partial unique index makes duplicate automated incidents impossible.
5. Checks older than `CHECK_RETENTION_DAYS` (default 120) are pruned at the end of each run.
6. Public pages read **aggregate views**: they can see status and timing, never monitor URLs, raw errors, or
   excerpts. Those are admin-only.

**Nothing about which services exist is hardcoded.** Groups, services, monitors, and their ordering are rows in the
database; the seed migration is only a starting point. Change them in the ops desk, not in code.

---

## 3. Requirements

| What | Value |
| --- | --- |
| Node.js | 22 or newer (`package.json` engines; CI uses 24) |
| Database | A hosted **Supabase Postgres** project — no local stack |
| Extensions | `pg_cron` and `pg_net` (enabled in Supabase → Database → Extensions) |
| Hosting | A Vercel project connected to this repository |
| Optional | A Groq API key for the draft writer |

---

## 4. Setup

**Setting up a second machine for a project that already exists?** Skip to 4.5: copy `.env.example` to
`.env.local`, fill in the three Supabase values, `npm install && npm run dev`, then sign in at `/admin/login` with an
allowlisted account. The rest of this section is for the first time only.

Work through this once, in order. Steps 4.1–4.4 happen in the Supabase dashboard.

### 4.1 Collect the three Supabase values

Supabase dashboard → Project Settings → API:

1. **Project URL** — `https://YOUR_PROJECT_REF.supabase.co`
2. **Anon / publishable key** — public by design; RLS still decides what a browser may read
3. **Service-role key** — server-only. Never put it in a `NEXT_PUBLIC_` variable, never paste it into an issue

### 4.2 Apply the migrations, in order

Supabase → SQL Editor → New query → paste one file → Run. Apply them in this sequence; each assumes the previous
one has already run.

| Order | File | Creates |
| --- | --- | --- |
| 1 | [`0001_init.sql`](supabase/migrations/0001_init.sql) | Enums, tables, defaults, triggers, RLS policies, views |
| 2 | [`0002_seed.sql`](supabase/migrations/0002_seed.sql) | Four starting groups, six services, the one verified monitor |
| 3 | [`0003_secure_checks.sql`](supabase/migrations/0003_secure_checks.sql) | Makes raw check rows admin-only, adds daily aggregate views |
| 4 | [`0004_public_monitor_status.sql`](supabase/migrations/0004_public_monitor_status.sql) | Keeps the public monitor-status view readable after 0003 |

The seed is idempotent (`on conflict do nothing`), so re-applying `0002` after a mistake will not duplicate rows. It
does **not** create the admin user — that is the next step.

### 4.3 Create the admin user and grant the allowlist row

1. Supabase → Authentication → Users → **Add user** → email + password. Tick *Auto Confirm User*, or confirm the
   address before signing in.
2. With the service-role key in `.env.local` (section 4.4), grant the row:

```bash
npm run grant-admin -- you@example.com
npm run grant-admin -- --list
```

Creating the auth user is **not** enough: `admin_users` is a separate allowlist with no public write policy, and
without that row every admin page and action refuses you. Revoking access removes the allowlist row and leaves the
auth user in place:

```bash
npm run grant-admin -- --revoke you@example.com
```

### 4.4 Point Supabase at the site

Supabase → Authentication → URL Configuration → **Site URL** = `https://status.fasthandstudio.asia`. Password
sign-in does not need redirect URLs.

### 4.5 Configure the environment

```bash
cp .env.example .env.local
```

Fill in the four required values, then start the app:

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — if something is missing, `/admin/login` names the variables instead of guessing.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL, used by browser and server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public key; RLS still applies |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Check runner, *Run check now*, `POST /api/checks/run`, admin CLI |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL for metadata; defaults to `https://status.fasthandstudio.asia` |
| `GROQ` | no | Groq API key for **Draft the copy**. Without it the box is not rendered at all |
| `GROQ_MODEL` | no | Pins the model. Left unset, the writer finds one this key has (see 7.3) |
| `SUPABASE_URL` | no | Used by the CLI scripts; falls back to the public URL |
| `CHECK_RETENTION_DAYS` | no | Check-history pruning window; default `120` |
| `CHECK_SOURCE` | no | Label written by `npm run checks`; default `manual` |

`.env.local` is git-ignored. Never commit real keys, and never print a key into a chat or a ticket.

### 4.6 Verify a fresh install

```bash
npm run typecheck
npm run build
npm run checks
```

`npm run checks` runs every enabled monitor once and writes real rows, so a brand-new project shows honest data
immediately instead of empty bars.

---

## 5. Scheduling the checks with pg_cron

There is exactly one scheduler. GitHub Actions was removed as a check runner on 2026-10-26 — two schedulers writing
overlapping runs made the history unreadable, and its three-per-six-hours cadence was worse than pg_cron's.

1. **Store the service-role key in Vault**: Supabase → Dashboard → Vault → add a secret named `status_service_key`.
   The cron job reads the key from Vault, so a stale copy there silently stops every scheduled check.
2. **Enable the extensions**: Database → Extensions → `pg_cron`, `pg_net`.
3. **Register the job** once in the SQL editor. Use the URL of the deployment that should be checked:

```sql
select cron.schedule(
  'fasthand-status-checks',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://status.fasthandstudio.asia/api/checks/run',
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

4. **Confirm it is firing:**

```sql
select jobid, jobname, command from cron.job where jobname = 'fasthand-status-checks';

select start_time, status, return_message
from cron.job_run_details
where jobname = 'fasthand-status-checks'
order by start_time desc
limit 5;
```

A job created before the custom domain may still call the `*.vercel.app` URL — both work. `cron.job` above tells you
which is registered; switch it deliberately, never in the middle of an incident.

Change the cadence by re-running `cron.schedule` with the same job name (on pg_cron 1.4+ this updates the job; on
older versions unschedule first), and stop it with:

```sql
select cron.unschedule('fasthand-status-checks');
```

If the runs stop landing, the deployment is unreachable or the key rotated — follow
[RUNBOOK → If the public page says Unknown / Stale](docs/RUNBOOK.md).

---

## 6. Deploying to Vercel

1. Import `fasthand-studio/Status-Page`. Framework preset **Next.js**; build command `npm run build`.
2. Add the environment variables from 4.5 to Production (and Preview/Development as needed). Vercel needs
   `SUPABASE_SERVICE_ROLE_KEY` too — *Run check now* and `POST /api/checks/run` run server-side.
3. Deploy, attach the `status.fasthandstudio.asia` domain, then set the Supabase Site URL (4.4) to the same value.
4. **A push to `main` is the deploy**: GitHub Actions runs typecheck + build, and Vercel builds and promotes the
   result. There is no separate release step.
5. If Vercel **Deployment Protection** (Vercel Authentication) is switched on, `*.vercel.app` URLs return a login
   page and pg_cron's calls will not get through. Turn it off for this project, or point the cron job at the custom
   domain, which is excluded by the `all_except_custom_domains` setting.
6. After the first deploy, re-check the live URLs in [section 12](#12-verification-after-any-change).

No Docker, no `supabase start`, no local Postgres.

---

## 7. Using the ops desk

### 7.1 Sign in

Go to `/admin/login`, use the email and password of the Supabase user that holds an `admin_users` row. A valid
session without an allowlist row is refused — that is the intended behaviour, not a bug.

### 7.2 Read the overview first

`/admin` answers three questions: what is broken now, whether the runner is alive, and which services need
attention. The **Runner** panel and its freshness counts are the fastest way to tell a real outage from a stopped
scheduler.

### 7.3 Publish an incident

1. `/admin/incidents` → **New incident**.
2. Fill in **Title**, choose **Impact** honestly (`minor` / `major` / `critical` — it drives the public severity
   label and the service's state), set **Status** (**Investigating** unless you already know more), and set
   **Started at (UTC)** — the public timeline uses that time, not the moment you saved.
3. Tick the services that are actually affected. Unticked services do not inherit the incident's health.
4. Write **First update** in Markdown: what customers see, what you know, what you do not know yet, and the next
   update time if you can commit to one. **Publish incident** puts it on the public page immediately.
5. Post further updates from the incident page: choose a **New status**, write the **Update** in Markdown, and press
   **Publish update**. Publishing **Resolved** sets `resolved_at` and closes the incident; posting a non-resolved
   status on a resolved incident reopens it.

Don't create a manual incident to duplicate an automated one — automated incidents are labelled **Auto-detected**.

**Draft the copy (optional).** When `GROQ` is set, the incident, update, and maintenance forms have a **Draft the
copy** box: type what happened the way you would tell a colleague, and Groq returns a title and customer-facing
prose that is written *into the fields*.

- It never publishes, and it never sees check data — it cannot invent a cause your notes do not contain.
- Notes are capped at 1500 characters; the reply is plain `TITLE:` / `BODY:` blocks.
- It asks for `llama-3.3-70b-versatile` first. Model entitlements differ per key, so if that request is refused it
  reads the key's own `/models` list and retries with the first candidate the key actually has; the confirmation
  message names the model that wrote the draft. Pin that one as `GROQ_MODEL` if you want it fixed.
- If none of the candidates exists, the error lists the model ids this key does have.
- Without `GROQ`, the box is not rendered — no button that does nothing.
- Read every drafted word before publishing. Correct anything that is not true.

### 7.4 Maintenance windows

`/admin/maintenance` → **New window**: **Title**, **Status**, **Starts (UTC)**, **Ends (UTC)**, **Services affected**,
and the **Public notice** in Markdown. **Publish window** makes it live immediately.

| Status | Effect |
| --- | --- |
| **Scheduled** | Affected services show **Maintenance** while the window's time range is open |
| **In progress** | Active immediately, regardless of the start time |
| **Completed** / **cancelled** | Stop affecting health; stay in the public archive |

### 7.5 Monitors — the only thing that makes a service green

Create at `/admin/monitors/new`. The form fields are **Name**, **Method**, **Health-check URL**, **Expected status
from / to**, **Expected text**, **Timeout (ms)**, **Check interval (seconds)**, **Open after failures**, **Resolve
after passes**, **Auto-incident impact**, and the **Run this monitor on the scheduled check** tick.

| Field | Default | Allowed | Notes |
| --- | --- | --- | --- |
| Method | `GET` | `GET` or `HEAD` | |
| Expected status from / to | 200 / 299 | 100–599 | A marketing page returning 200 proves nothing |
| Expected text | empty | ≤ 500 chars | Compared after collapsing whitespace; the reply is read up to 64 KB |
| Timeout (ms) | 10000 | 1000–60000 | Hard abort |
| Check interval (seconds) | 300 | 60–86400 | Also sets the staleness window |
| Open after failures | 3 | 1–12 | Consecutive failures before an auto-incident opens |
| Resolve after passes | 3 | 1–12 | Consecutive passes before it closes |
| Auto-incident impact | `major` | `none`…`critical` | The severity an automated incident is filed with |

Then:

- **Run check now** performs one live check and stores the real result — use it before you trust a monitor.
- **Pause monitor** (or untick *Run this monitor on the scheduled check*) stops scheduled checks and stops opening
  or resolving incidents. Manual runs still work, old evidence stays, and the page marks it stale rather than
  assuming recovery.
- A monitor URL that points at a loopback, private, link-local, metadata, multicast, or reserved address is
  **refused before the request is made**, and every redirect hop is re-checked. Point monitors at public health
  routes only.

The rule that keeps this page trustworthy: attach a monitor only after you have **verified** that the endpoint
reflects that service's health. If there is no such endpoint, leave the service unmonitored and let it read
**No check**.

The seeded monitor is the data-centre heartbeat:

```text
https://fasthanddatacenter.fasthandstudio.asia/isitonline
expect HTTP 200-299 containing "Hey bro iam online"
```

### 7.6 Services

`/admin/services` → **New service**: name, slug (blank derives it from the name), group, description, sort order,
**Show this service on the public status page**, and the monitor.

- Attaching a monitor starts building uptime history from the next check; nothing is backfilled.
- Unattaching a monitor does not delete stored results.
- Hiding a service removes it from the public page but keeps its history.
- A service with no monitor renders as **No check** and contributes nothing to the overall banner.

### 7.7 Groups

`/admin/groups` is where the public page's headings come from — create, rename, reorder, delete, instead of editing
SQL. A group holds a name, an optional slug, an optional description, and a sort order (lower appears first on `/`
and `/services`). The four starting groups are *Core Infrastructure*, *Seller Platform*, *Identity & Data*, and
*Web Presence*.

A group with services in it cannot be deleted: the schema uses `on delete restrict` on purpose, and the ops desk
refuses and tells you how many services are in the way. Move them to another group, or delete them, then delete the
group.

### 7.8 Deleting anything

Every destructive action uses the same two-step arm/confirm button and states what actually goes. Deleting a service
removes its incident and maintenance links but keeps its monitor and check history; deleting a monitor does not
delete the service.

---

## 8. Health states and uptime math

| State | Shown when |
| --- | --- |
| **Operational** | An attached monitor has a fresh passing check |
| **Degraded** | An open incident with `minor` impact affects the service |
| **Outage** | An open incident with `major` or `critical` impact affects the service |
| **Maintenance** | An open scheduled or in-progress window covers the service |
| **Unknown** | A monitor exists but its last check is older than `max(3 × cadence, 15 min)` |
| **No check** | No monitor is attached, or no check has ever run |

- Uptime is `ok_checks / checks` inside the requested UTC day window (7 / 30 / 90 days).
- Days with no checks are grey and contribute nothing — they are never counted as 100%.
- Percentages are truncated at two decimals, so `99.999%` displays as `99.99%`.
- The banner says **“All monitored systems operational”**, not “everything is fine”, because coverage is usually
  partial.

---

## 9. Configuration reference

Server-side behaviour you may want to change lives in code, not config:

| Setting | Where | Value |
| --- | --- | --- |
| Check response body cap | `lib/check.ts` | 64 KB read cap, 280-char excerpt stored on failure |
| Redirect hops followed | `lib/check.ts` | 5, each re-validated for protocol and private addresses |
| Blocked monitor targets | `lib/check.ts` | loopback, RFC1918, CGNAT, link-local, multicast, reserved, `localhost`, `.internal`, `.local`, metadata hostnames |
| Draft request body cap | `app/api/incident-draft/route.ts` | 8 KB |
| Draft rate limit | `lib/draft-throttle.ts` | 10 drafts per admin per 10 minutes, per warm instance |
| Staleness window | `lib/status.ts` | `max(3 × cadence, 900 s)` |
| Check retention | `scripts/run-checks.ts` | `CHECK_RETENTION_DAYS`, default 120 |
| Groq model candidates | `lib/incident-writer.ts` | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `openai/gpt-oss-20b`, `meta-llama/llama-4-scout-17b-16e-instruct` |

Database defaults (timeouts, thresholds, status ranges, sort orders) are column defaults in
[`0001_init.sql`](supabase/migrations/0001_init.sql) and are editable per row in the ops desk.

---

## 10. Scripts and commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run checks` | Run every enabled monitor once and store the results (labels the run `manual`) |
| `npm run grant-admin -- <email>` | Add an existing auth user to the admin allowlist |
| `npm run grant-admin -- --list` | Show granted admins |
| `npm run grant-admin -- --revoke <email>` | Remove admin access (the auth user remains) |

The `grant-admin` and `checks` scripts need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

---

## 11. Security model

- **Allowlist, not “any signed-in user”.** Every admin page and server action resolves `getAdminContext()`: a valid
  Supabase session **and** an `admin_users` row. The machine endpoints are separate: `POST /api/checks/run` accepts
  only the service-role bearer key (compared in constant time), and `POST /api/incident-draft` requires an admin
  session.
- **RLS on every table.** Public reads are limited to public status data; writes require `is_admin()`, a
  `security definer` function with a fixed `search_path`. `admin_users` has no insert/update/delete policy and is
  bootstrapped with the service role.
- **Middleware** refreshes the session on `/admin/*` and redirects anonymous visitors to `/admin/login`; the admin
  layout re-checks the allowlist, and the section is `noindex`.
- **Raw check rows are private.** Monitor URLs, error text, and body excerpts are admin-only. The public reads
  `monitor_status` (a `security definer` view exposing status and timing only) and the daily aggregate views.
- **SSRF guard on outbound checks.** Loopback, private, link-local, metadata, multicast and reserved addresses are
  refused before any request, redirects are followed manually and re-checked on every hop, and responses are capped
  and hard-timed-out.
- **The draft endpoint is not a free proxy for your Groq key.** It requires an admin session and allowlist row,
  checks `Sec-Fetch-Site`/`Origin` so the call came from the ops desk, rejects bodies over 8 KB, throttles to ten
  drafts per admin per ten minutes, and answers with `cache-control: no-store`. The key never leaves the server
  function.
- **Markdown is rendered without raw HTML** (`react-markdown` + `remark-gfm`), so an admin cannot inject scripts
  into public pages.
- **Secrets stay server-side.** `SUPABASE_SERVICE_ROLE_KEY` is used by the runner, the CLI, and *Run check now*, and
  is never shipped to the browser. `POST /api/checks/run` compares the bearer token in constant time.
- **No dead auth UI**: no sign-up, password reset, or social buttons that do nothing.

Known limits, stated plainly: admin sign-in is password-only (turn on MFA in Supabase if you need it), the public
page relies on Vercel/Supabase rate limiting, the draft throttle counts hits per warm function instance so it stops
a stuck operator rather than a determined one, a public hostname that resolves to a private address (DNS rebinding)
passes the monitor guard — resolving DNS first would turn a DNS outage into a false incident — and there is no audit
log beyond row timestamps and update authors.

---

## 12. Verification after any change

```bash
npm run typecheck
npm run build
```

CI runs both on every push to `main` and Vercel deploys the result. **There is no unit-test suite in this repo**
(removed 2026-10-26), so the real safety net is the running system — probe it:

```bash
# public page renders and reports its coverage honestly
curl -s -o /dev/null -w '%{http_code}\n' https://status.fasthandstudio.asia/

# anonymous writes are refused with 401, not 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://status.fasthandstudio.asia/api/checks/run
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://status.fasthandstudio.asia/api/incident-draft

# the ops desk requires a session — substitute your own site URL for example.com;
# an anonymous request must redirect, never render
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://example.com/admin

# the scheduler is alive: newest run is pg-cron and within the cadence
# (run in the Supabase SQL editor)
# select source, started_at from monitor_runs order by started_at desc limit 3;
```

Then confirm in the browser with your admin session that the changed form saves and the public page reflects it.

---

## 13. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Everything reads **Unknown** | The scheduler stopped. `/admin` → Runner panel, then `cron.job_run_details`; re-`schedule` if the job is gone. |
| **Unknown** with runs present but 401s | The service-role key rotated. Update Vercel **and** Vault's `status_service_key`, then redeploy. |
| One service stuck on **No check** | No monitor attached, or none has ever run. Attach one and use **Run check now**. |
| A monitor fails right after working | The endpoint changed (phrase, redirect, user-agent, timeout). Fix the monitor; don't delete the expected phrase unless the new contract is verified. |
| Sign-in succeeds but pages refuse you | No `admin_users` row. `npm run grant-admin -- you@example.com`. |
| Draft button missing | `GROQ` is not set in that environment. |
| `model_not_found` from the writer | This key has none of the candidate models; the error lists the ids it does have — pin one as `GROQ_MODEL` and redeploy. |
| Groq says the context length was exceeded | Trim the notes; the cap is 1500 characters. |

Full procedures, including during an incident and secret rotation, are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

## 14. Project layout

```text
app/(public)/          Status home, services, incidents, maintenance, history
app/admin/             Login, the ops desk routes, and all server actions
app/api/               /api/checks/run (pg_cron trigger) and /api/incident-draft (admin writer)
components/            Public UI, admin UI (forms, tables, draft writer), Markdown renderer
lib/                   Types, Supabase clients, auth, queries, status math, checks, automation, validation
supabase/migrations/   Schema + RLS, seed, check privacy, public monitor status view
scripts/               Check runner and admin allowlist CLI
middleware.ts          Session refresh and /admin redirect
docs/RUNBOOK.md        Incident, scheduler, and access procedures
.github/workflows/     CI: typecheck + build only
```

### Data model

| Table | Holds |
| --- | --- |
| `service_groups` | Public headings and their order |
| `services` | The inventory; `group_id` is required and restricted from cascade deletion |
| `monitors` | What to check and what “healthy” means, per monitor |
| `check_results` | One row per check: status, timing, error, failure excerpt (admin-only) |
| `monitor_runs` | One row per runner invocation, with counts and `source` |
| `incidents` / `incident_updates` / `incident_services` | Incidents, their Markdown timeline, and affected services |
| `maintenance_windows` / `maintenance_services` | Windows and the services they cover |
| `admin_users` | The allowlist; no public write policy |

---

## 15. Deliberate limitations

- **No fabricated demo history.** A fresh database shows empty bars until the first scheduled run.
- **No email/SMS subscribers.** The page has no subscribe form that does nothing.
- **No per-service public pages.** Service detail lives in the directory and group rows.
- **A five-minute cadence is not a pager.** Detection needs the deployment reachable and the cron job registered,
  and a sustained failure only opens an incident after the failure threshold.
- **Drafts are not truth.** The writer turns *your* notes into customer-facing prose, cannot publish, and never sees
  check data. You remain responsible for every published word.
