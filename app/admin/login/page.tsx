import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/components/admin/login-form';
import { signOutAction } from '../actions';
import { adminCardClass, linkClass, Notice, secondaryButtonClass } from '@/components/admin/ui';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { LockIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, string> = {
  not_admin: 'That account is not on the admin allowlist.',
  unconfigured: 'Supabase is not configured yet. Complete the environment variables, then reload this page.',
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getAdminContext();
  if (context.status === 'admin') redirect('/admin');

  const params = await searchParams;
  const errorCopy = params.error ? ERROR_COPY[params.error] : undefined;

  return (
    <div className="admin-shell min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-4 py-6 sm:px-6 lg:py-8">
          <div>
            <Brand label="Ops" />
            <h1 className="mt-6 max-w-md text-[32px] font-semibold leading-[1.12] tracking-[-0.03em]">
              The desk behind the status page.
            </h1>
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">
              Publish incidents in Markdown, resolve them with a timeline, pause a monitor, or run a
              check on demand. Every public number comes from stored check history — this panel does
              not invent uptime.
            </p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {[
              ['Write', 'Markdown updates with a live preview.'],
              ['Measure', 'Uptime stays tied to real checks.'],
              ['Verify', 'Row Level Security on every write.'],
              ['Access', 'Sign-in limited to the admin allowlist.'],
            ].map(([headline, copy]) => (
              <div key={headline} className="fh-r-sm border border-line bg-paper/60 p-3">
                <p className="text-[15px] font-semibold">{headline}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-4 pb-8 sm:px-6 lg:border-l lg:border-line lg:py-8">
          <div className="w-full lg:mx-auto lg:max-w-sm">
            <div className="mb-4 flex items-center gap-2">
              <LockIcon className="h-4 w-4" />
              <h2 className="text-[18px] font-semibold">Admin sign in</h2>
            </div>

            {!isSupabaseConfigured ? (
              <div className="space-y-3">
                <Notice tone="warn">
                  Supabase is not connected. The status page can render, but there are no checks,
                  incidents, or admin accounts until it is.
                </Notice>
                <div className={`${adminCardClass} space-y-2 px-3 py-2`}>
                  <p className="font-medium">Environment variables needed</p>
                  <ul className="space-y-1 text-[15px] leading-relaxed text-muted">
                    <li>NEXT_PUBLIC_SUPABASE_URL</li>
                    <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                    <li>SUPABASE_SERVICE_ROLE_KEY</li>
                  </ul>
                  <p className="text-[15px] leading-relaxed text-muted">
                    Apply both migrations in the Supabase SQL editor, create the admin user in
                    Authentication, then run{' '}
                    <span className="font-sans text-ink">npm run grant-admin -- you@example.com</span>.
                  </p>
                </div>
              </div>
            ) : context.status === 'forbidden' ? (
              <div className="space-y-3">
                <Notice tone="warn">
                  Signed in as <span className="font-sans">{context.email}</span>, but this account is
                  not on the admin allowlist.
                </Notice>
                <p className="text-[14px] leading-relaxed text-muted">
                  An existing admin can grant access from the repository:
                </p>
                <pre className="overflow-x-auto fh-r-sm border border-line bg-paper px-3 py-2 text-[15px]">
                  npm run grant-admin -- {context.email}
                </pre>
                <form action={signOutAction}>
                  <button type="submit" className={secondaryButtonClass}>
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <>
                {errorCopy ? (
                  <div className="mb-3">
                    <Notice tone="warn">{errorCopy}</Notice>
                  </div>
                ) : null}
                <LoginForm />
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  Looking for the public page?{' '}
                  <Link href="/" className={linkClass}>
                    Return to status
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
