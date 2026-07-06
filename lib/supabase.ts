import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the SECRET key (bypasses RLS). Never import
// this into a client component - the secret key must never reach the browser.
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY are not set");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
