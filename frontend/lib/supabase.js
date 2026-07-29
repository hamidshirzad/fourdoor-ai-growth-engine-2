import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Reserved for realtime/storage features. App auth stays on the Express
// backend (JWT + WorkOS SSO) — do not use Supabase Auth here.
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function isSupabaseEnabled() {
  return supabase !== null;
}
