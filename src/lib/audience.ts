import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Audience = "everyone" | "applied" | "shortlisted" | "not_applied" | "hand_picked";

export const AUDIENCES: Audience[] = ["everyone", "applied", "shortlisted", "not_applied", "hand_picked"];

// "Shortlisted" reads as a current state, not a milestone passed -- a
// student who has since moved to in_process or offer is counted there
// instead, not here too, so the five audiences never overlap.
export async function resolveAudience(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  audience: Audience,
  jobId: string | null,
  handPickedIds: string[],
): Promise<string[]> {
  if (audience === "hand_picked") {
    return Array.from(new Set(handPickedIds));
  }

  if (audience === "everyone") {
    const { data } = await supabase.from("students").select("id");
    return (data ?? []).map((s) => s.id as string);
  }

  if (!jobId) return [];

  if (audience === "applied") {
    const { data } = await supabase.from("applications").select("student_id").eq("job_id", jobId);
    return Array.from(new Set((data ?? []).map((a) => a.student_id as string)));
  }

  if (audience === "shortlisted") {
    const { data } = await supabase
      .from("applications")
      .select("student_id")
      .eq("job_id", jobId)
      .eq("status", "shortlisted");
    return Array.from(new Set((data ?? []).map((a) => a.student_id as string)));
  }

  // not_applied
  const [{ data: allStudents }, { data: applied }] = await Promise.all([
    supabase.from("students").select("id"),
    supabase.from("applications").select("student_id").eq("job_id", jobId),
  ]);
  const appliedIds = new Set((applied ?? []).map((a) => a.student_id as string));
  return (allStudents ?? []).map((s) => s.id as string).filter((id) => !appliedIds.has(id));
}
