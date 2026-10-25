import { config as loadEnv } from 'dotenv';
import { createServiceClient } from '../lib/supabase/admin';
import { runMonitorCheck } from '../lib/monitoring';
import { pruneOldChecks } from '../lib/monitoring';
import type { Monitor } from '../lib/types';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const source =
  process.env.CHECK_SOURCE?.trim() ||
  (process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'manual');
const retentionDays = Number(process.env.CHECK_RETENTION_DAYS ?? '120');

async function main() {
  const client = createServiceClient();

  const { data: run, error: runError } = await client
    .from('monitor_runs')
    .insert({ source })
    .select('id')
    .single();

  if (runError || !run) {
    throw new Error(
      `Could not start a monitor run: ${runError?.message ?? 'no row returned'}. Check that migrations 0001–0003 have been applied and the service-role key is correct.`,
    );
  }

  const runId = run.id as string;
  const { data: monitorRows, error: monitorError } = await client
    .from('monitors')
    .select('*')
    .eq('enabled', true)
    .order('name');

  if (monitorError) {
    throw new Error(`Could not load monitors: ${monitorError.message}`);
  }

  const monitors = (monitorRows ?? []) as Monitor[];
  let checksRun = 0;
  let failures = 0;
  let internalErrors = 0;

  if (monitors.length === 0) {
    console.warn('No enabled monitors. Run recorded with zero checks.');
  }

  for (const monitor of monitors) {
    checksRun += 1;
    try {
      const result = await runMonitorCheck(client, monitor);
      if (!result.outcome.ok) failures += 1;

      const status = result.outcome.statusCode ?? 'no response';
      console.log(
        `[${result.outcome.ok ? 'PASS' : 'FAIL'}] ${monitor.name} · HTTP ${status} · ${result.outcome.responseTimeMs} ms`,
      );
      if (result.outcome.error) {
        console.log(`       ${result.outcome.error}`);
      }
      if (result.automation.action === 'open') {
        console.log(`       automated incident opened: ${result.incidentId ?? 'unknown id'}`);
      }
      if (result.automation.action === 'resolve') {
        console.log(`       automated incident resolved: ${result.incidentId}`);
      }
    } catch (caught) {
      failures += 1;
      internalErrors += 1;
      console.error(
        `[ERROR] ${monitor.name}: ${caught instanceof Error ? caught.message : 'unknown failure'}`,
      );
    }
  }

  if (retentionDays > 0) {
    try {
      const pruned = await pruneOldChecks(client, retentionDays);
      if (pruned > 0) console.log(`Pruned ${pruned} check rows older than ${retentionDays} days.`);
    } catch (caught) {
      console.error(
        `Prune failed (checks were still recorded): ${caught instanceof Error ? caught.message : 'unknown error'}`,
      );
    }
  }

  const { error: finishError } = await client
    .from('monitor_runs')
    .update({
      finished_at: new Date().toISOString(),
      checks_run: checksRun,
      failures,
    })
    .eq('id', runId);

  if (finishError) {
    throw new Error(`Checks finished but the run row could not be closed: ${finishError.message}`);
  }

  console.log(
    `Run complete: ${checksRun} check${checksRun === 1 ? '' : 's'}, ${failures} failure${failures === 1 ? '' : 's'}${
      internalErrors ? `, ${internalErrors} internal error${internalErrors === 1 ? '' : 's'}` : ''
    }.`,
  );

  if (internalErrors > 0) process.exitCode = 1;
}

main().catch((caught) => {
  console.error(`Status check run failed: ${caught instanceof Error ? caught.message : caught}`);
  process.exitCode = 1;
});
