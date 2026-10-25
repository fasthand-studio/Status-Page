import { config as loadEnv } from 'dotenv';
import { runScheduledChecks } from '../lib/run-scheduled-checks';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const source =
  process.env.CHECK_SOURCE?.trim() ||
  (process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'manual');
const retentionDays = Number(process.env.CHECK_RETENTION_DAYS ?? '120');

runScheduledChecks({ source, retentionDays })
  .then((result) => {
    if (result.internalErrors > 0) process.exitCode = 1;
  })
  .catch((caught) => {
    console.error(`Status check run failed: ${caught instanceof Error ? caught.message : caught}`);
    process.exitCode = 1;
  });
