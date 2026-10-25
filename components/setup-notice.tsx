import { ArrowUpRightIcon } from './icons';

export function SetupNotice() {
  return (
    <div className="fh-panel border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Connect the monitoring stack</h2>
      <p className="mt-1.5 max-w-2xl text-[17px] leading-relaxed text-muted">
        This page does not invent uptime. Until Supabase and the five-minute check workflow are
        connected, every service stays unmeasured.
      </p>
      <ol className="mt-5 grid gap-3 text-[15px] leading-relaxed sm:grid-cols-2">
        <li className="fh-r-sm border border-line bg-paper/60 p-4">
          <span className="text-[13px] font-semibold text-muted">1</span>
          <p className="mt-1">
            Create a Supabase project, then run{' '}
            <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">0001_init.sql</code> and{' '}
            <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">0002_seed.sql</code> from{' '}
            <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">supabase/migrations</code>.
          </p>
        </li>
        <li className="fh-r-sm border border-line bg-paper/60 p-4">
          <span className="text-[13px] font-semibold text-muted">2</span>
          <p className="mt-1">
            Set the project URL, anon key, and service role key in Vercel. The service role key never
            reaches the browser.
          </p>
        </li>
        <li className="fh-r-sm border border-line bg-paper/60 p-4">
          <span className="text-[13px] font-semibold text-muted">3</span>
          <p className="mt-1">
            Add GitHub Actions secrets <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">SUPABASE_URL</code>{' '}
            and <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">SUPABASE_SERVICE_ROLE_KEY</code>,
            then run the Checks workflow once.
          </p>
        </li>
        <li className="fh-r-sm border border-line bg-paper/60 p-4">
          <span className="text-[13px] font-semibold text-muted">4</span>
          <p className="mt-1">
            Create your admin account with{' '}
            <code className="fh-r-xs bg-ink/5 px-1 py-0.5 font-sans text-[15px]">npm run grant-admin -- you@example.com</code>{' '}
            and sign in at the operations desk.
          </p>
        </li>
      </ol>
      <a
        href="https://github.com/fasthand-studio/Status-Page#readme"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 inline-flex items-center gap-1.5 text-[15px] underline decoration-lime-deep decoration-2 underline-offset-4 hover:decoration-ink"
      >
        Full setup guide
        <ArrowUpRightIcon className="h-4 w-4" />
      </a>
    </div>
  );
}
