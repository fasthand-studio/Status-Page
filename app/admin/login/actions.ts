'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { failed, type ActionState } from '@/lib/action-state';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return failed('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.');
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return failed(parsed.error.issues[0]?.message ?? 'Check your email and password.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return failed('Email or password is incorrect.');
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return failed('That account has not confirmed its email address yet.');
    }
    return failed(`Sign-in failed: ${error.message}`);
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    return failed('That account is not on the admin allowlist. Run npm run grant-admin -- you@example.com, then sign in again.');
  }

  redirect('/admin');
}
