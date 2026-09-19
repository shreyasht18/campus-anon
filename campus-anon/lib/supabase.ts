import { createClient } from "@supabase/supabase-js";

// One shared client for the whole app.
// Placeholders keep the page from crashing if the env vars are missing.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);
