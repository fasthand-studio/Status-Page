import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from './supabase/config';
import { createSupabaseServerClient } from './supabase/server';

export type AdminContext =
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'forbidden'; email: string }
  | {
      status: 'admin';
      email: string;
      userId: string;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    };

export async function getAdminContext(): Promise<AdminContext> {
  if (!isSupabaseConfigured) return { status: 'unconfigured' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: 'signed-out' };

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] admin allowlist query failed:', error.message);
    return { status: 'forbidden', email: user.email ?? 'unknown' };
  }
  if (!admin) return { status: 'forbidden', email: user.email ?? 'unknown' };

  return {
    status: 'admin',
    email: admin.email,
    userId: user.id,
    supabase,
  };
}

export async function requireAdminContext(): Promise<Extract<AdminContext, { status: 'admin' }>> {
  const context = await getAdminContext();
  if (context.status === 'admin') return context;
  if (context.status === 'signed-out') redirect('/admin/login');
  if (context.status === 'unconfigured') redirect('/admin/login?error=unconfigured');
  redirect('/admin/login?error=not_admin');
}
