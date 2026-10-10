import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing. Copy .env.example to .env.local and fill it in.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
