import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Lazily create the Supabase client so the app never touches Supabase
 * (or requires its env vars) when running in local mode.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    // Supabase's new API keys are named "publishable" (sb_publishable_...);
    // older projects still use the legacy "anon" JWT. Accept either.
    const key =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'VITE_SUPABASE_URL ja VITE_SUPABASE_PUBLISHABLE_KEY (tai VITE_SUPABASE_ANON_KEY) puuttuvat. ' +
          'Aseta ne .env-tiedostoon tai vaihda VITE_DATA_MODE=local.'
      );
    }
    client = createClient(url, key);
  }
  return client;
}
