import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// applications.status_changed_at does not exist in the live database --
// only application_status_history does (see schema_r2.sql). This derives
// the same "when did the status last change" value from that table's
// most recent row per application, for callers that used to read the
// column directly. An application whose status has never changed has no
// history row at all, so callers should fall back to applied_at.
export async function getStatusChangedAtMap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  applicationIds: string[],
): Promise<Map<string, string>> {
  if (applicationIds.length === 0) return new Map();

  const { data } = await supabase
    .from("application_status_history")
    .select("application_id, changed_at")
    .in("application_id", applicationIds)
    .order("changed_at", { ascending: false });

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.application_id)) map.set(row.application_id, row.changed_at);
  }
  return map;
}
