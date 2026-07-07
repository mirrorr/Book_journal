import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Lazily create the Supabase client so the app never touches Supabase
 * (or requires its env vars) when running in local mode.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        'VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY puuttuvat. ' +
          'Aseta ne .env-tiedostoon tai vaihda VITE_DATA_MODE=local.'
      );
    }
    client = createClient(url, anonKey);
  }
  return client;
}
