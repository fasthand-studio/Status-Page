import { ArrowUpRightIcon } from './icons';

const STEPS = [
  {
    title: 'Apply the schema',
    body: 'Run 0001 through 0004 from supabase/migrations in the Supabase SQL editor.',
  },
  {
    title: 'Set environment',
    body: 'Add the project URL, anon key, and service role key in Vercel. The service key never reaches the browser.',
  },
  {
    title: 'Schedule checks',
    body: 'Run the pg_cron job from the README so every five-minute pass hits /api/checks/run.',
  },
  {
    title: 'Create an admin',
    body: 'Grant your account with npm run grant-admin, then sign in at the operations desk.',
  },
];

export function SetupNotice() {
  return (
    <div className="fh-panel border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-[18px] font-semibold">Connect the monitoring stack</h2>
      <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">
        This page does not invent uptime. Until the database and the five-minute check runner are
        connected, every service stays unmeasured.
      </p>
      <ol className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2.5 border-t border-line pt-2.5">
            <span className="fh-num mt-px text-[14px] font-semibold text-muted">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-[15px] font-medium">{step.title}</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <a
        href="https://github.com/fasthand-studio/Status-Page#readme"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline"
      >
        Full setup guide
        <ArrowUpRightIcon className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
