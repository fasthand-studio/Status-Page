export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const isServiceConfigured = Boolean(
  (process.env.SUPABASE_URL?.trim() || supabaseUrl) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
);

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://status.fasthandstudio.asia';

export function getServiceConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }
  return { url, serviceRoleKey };
}
