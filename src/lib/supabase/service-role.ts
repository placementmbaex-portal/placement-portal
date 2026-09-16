import { createClient } from "@supabase/supabase-js";

// Bypasses row level security entirely. Only ever call this from a server
// action that has already verified the caller is an admin -- this client
// trusts every query unconditionally and must never reach client code.
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
