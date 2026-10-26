# Runbook

Operational steps for the FastHand status page. Keep this short enough to use while something is broken.

## During an incident

1. `/admin/incidents/new`.
2. Write a factual title, choose **Impact** honestly (minor / major / critical), and leave the status at
   **Investigating** unless you already know more.
3. Tick the services that are actually affected. Unticked services will not inherit the incident's health.
4. Write the first update in Markdown: what customers see, what you know, what you do not know yet, and the
   next update time if you can commit to one. In a hurry, type those facts into **What is the issue?** and
   press **Draft the copy** — it fills the fields, nothing publishes until you do, and it has never seen a
   check result, so correct anything it guessed.
5. Publish. It appears on the public page immediately.
6. Post further updates as the status changes. Each update carries its own status; publishing **Resolved**
   sets `resolved_at` and closes the incident.
7. If you reopen a resolved incident by posting a non-resolved status, the public page treats it as open
   again.

Do not create a manual incident to duplicate an automated one. Automated incidents are labelled
**Auto-detected** and have their own recovery rule.

## Automated incidents

- Opened after `failure_threshold` consecutive failures (default 3 checks ≈ 15 minutes).
- One open auto-incident per monitor, enforced by a unique index.
- Resolved automatically after `recovery_threshold` consecutive passes, with a closing update written by
  “Automated monitoring”.
- An admin can post updates on them or resolve them manually. Automation will still resolve on recovery.

## If the public page says Unknown / Stale

That is the honest state, not a bug.

1. `/admin` → check the **Runner** panel and the warning banner.
2. Supabase → SQL editor: is the job still registered and firing?

   ```sql
   select jobname, jobstatus from cron.job;
   select start_time, status, return_message
   from cron.job_run_details
   where jobname = 'fasthand-status-checks'
   order by start_time desc
   limit 5;
   ```

3. If the job is missing, re-run the `cron.schedule` block in the README. If it is firing but the runs are
   not landing, the deployment is unreachable or the bearer key rotated — `curl -X POST` the
   `/api/checks/run` endpoint with the service-role key and read the response.
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` still matches in Vercel and in **Vault** (`status_service_key`).
5. Run `npm run checks` locally against the same Supabase project to prove the monitors and the database are
   fine and only the scheduler is broken.
6. Do not publish a green state manually. Fix the checks and let fresh results replace the grey bars.

## If a monitor is failing

1. `/admin/monitors/[id]` → read the last checks and the stored error/excerpt.
2. Open the URL yourself. If the endpoint is genuinely down, post an incident update (or let the automated
   incident stand).
3. If the check is wrong — changed phrase, new redirect, blocked user agent, timeout too low — fix the
   monitor. Do not “fix” it by removing the expected phrase unless the new contract is verified.
4. Use **Pause monitor** if the endpoint must go away temporarily. Paused monitors stop opening incidents
   and stop receiving scheduled checks; the public page keeps the last evidence and marks it stale.

## Adding a service / monitor

1. Verify a health endpoint that proves the service. HTTP 200 alone is not enough.
2. Create or edit the monitor; run it once and inspect the stored result.
3. Attach it to the service. Confirm the public row changes from **No check** to a measured state.
4. Watch one scheduled run.

## Admin access

```bash
npm run grant-admin -- --list
npm run grant-admin -- someone@example.com
npm run grant-admin -- --revoke someone@example.com
```

Requires `.env.local` with `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and
`SUPABASE_SERVICE_ROLE_KEY`. The auth user must already exist in Supabase Authentication.

## Secret rotation

1. Supabase → Project Settings → API → rotate the service-role key.
2. Update the Vercel environment variable and the `status_service_key` secret in Supabase Vault — the cron
   job reads the key from Vault, so a stale copy there silently stops every scheduled check.
3. Redeploy Vercel if the running deployment needs the new key immediately.
4. Revoke old admin accounts by email; deleting the `admin_users` row is immediate, deleting the auth user
   is optional.

## Maintenance windows

- Create before the window starts; times are UTC.
- **Scheduled** marks affected services as maintenance while the window is open.
- **In progress** is active immediately, regardless of the start time.
- **Completed** / **cancelled** stop affecting health but stay in the public archive.

## Things this system will never do

- Invent uptime for a service without checks.
- Treat a late check as healthy.
- Let a public visitor write incidents or read monitor URLs and raw errors.
- Let a signed-in non-admin reach the ops desk.
