import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by every settings sub-page's actions (Notifications, General) --
// one upsert shape for the whole app_settings table.
export async function upsertSetting(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  key: string,
  value: unknown,
) {
  return supabase
    .from("app_settings")
    .upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() });
}
