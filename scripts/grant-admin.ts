import { config as loadEnv } from 'dotenv';
import { createServiceClient } from '../lib/supabase/admin';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase() ?? '';

function usage(): never {
  console.log(`Usage:
  npm run grant-admin -- admin@example.com     Grant admin access
  npm run grant-admin -- --revoke admin@example.com
  npm run grant-admin -- --list`);
  process.exit(1);
}

async function findUserByEmail(client: ReturnType<typeof createServiceClient>, target: string) {
  let page = 1;
  while (page <= 50) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list auth users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === target);
    if (user) return user;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

async function main() {
  const client = createServiceClient();

  if (flags.has('--list')) {
    const { data, error } = await client
      .from('admin_users')
      .select('email, user_id, created_at')
      .order('created_at');
    if (error) throw new Error(`Could not read admin_users: ${error.message}`);
    if (!data || data.length === 0) {
      console.log('No admin users are granted yet.');
      return;
    }
    for (const row of data) {
      console.log(`${row.email}  ${row.user_id}  granted ${row.created_at}`);
    }
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) usage();

  const user = await findUserByEmail(client, email);
  if (!user) {
    throw new Error(
      `No Supabase Auth user exists for ${email}. Create the user in Authentication → Users first (email + password), then run this again.`,
    );
  }

  if (flags.has('--revoke')) {
    const { error } = await client.from('admin_users').delete().eq('user_id', user.id);
    if (error) throw new Error(`Could not revoke admin access: ${error.message}`);
    console.log(`Revoked admin access for ${email}. The auth account still exists.`);
    return;
  }

  const { error } = await client
    .from('admin_users')
    .upsert({ user_id: user.id, email }, { onConflict: 'user_id' });

  if (error) throw new Error(`Could not grant admin access: ${error.message}`);

  console.log(`Granted admin access to ${email} (${user.id}).`);
  console.log('Sign in at /admin/login with that account.');
}

main().catch((caught) => {
  console.error(caught instanceof Error ? caught.message : caught);
  process.exitCode = 1;
});
