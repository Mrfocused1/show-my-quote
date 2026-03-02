import { createClient } from '@supabase/supabase-js';

// Singleton client for server-side use (service role key — bypasses RLS).
let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB writes skipped');
    return null;
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
