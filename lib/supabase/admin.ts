import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceConfig } from './config';

export function createServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = getServiceConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application-name': 'fasthand-status-service' },
    },
  });
}
