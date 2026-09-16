"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type ToggleAdminResult = { error?: string } | null;

// The guard_student_update trigger is the real gate here -- it raises on
// "demote yourself" and "remove the last admin" -- so this never
// pre-checks either case client- or server-side. Whatever it raises is
// returned as-is rather than replaced with a generic message.
export async function toggleAdmin(
  studentId: string,
  nextIsAdmin: boolean,
): Promise<ToggleAdminResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("students")
    .update({ is_admin: nextIsAdmin })
    .eq("id", studentId);

  if (error) {
    console.error("toggleAdmin: students update failed", error);
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  return null;
}

export type AllowlistFormState = { error?: string; success?: boolean } | null;

function parseExperience(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: null };
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) {
    return { ok: false, error: "Experience must be a positive number." };
  }
  return { ok: true, value: parsed };
}

// Only ever writes allowed_students -- adding someone here does not create
// a students row. That happens on their own first sign-in, via
// handle_new_user() looking their email up in this same table.
export async function addAllowedStudent(
  _prevState: AllowlistFormState,
  formData: FormData,
): Promise<AllowlistFormState> {
  const { supabase } = await requireAdmin();

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const name = ((formData.get("name") as string) ?? "").trim();
  const rollNo = ((formData.get("roll_no") as string) ?? "").trim();
  const experienceRaw = ((formData.get("total_experience_years") as string) ?? "").trim();

  if (!email || !email.includes("@")) return { error: "A valid email is required." };
  if (!name) return { error: "Name is required." };

  const experience = parseExperience(experienceRaw);
  if (!experience.ok) return { error: experience.error };

  const { error } = await supabase.from("allowed_students").insert({
    email,
    name,
    roll_no: rollNo || null,
    total_experience_years: experience.value,
  });

  if (error) {
    console.error("addAllowedStudent: allowed_students insert failed", error);
    return { error: `Could not add to the allowlist: ${error.message}` };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export type RemoveAllowlistState = { error?: string } | null;

export async function removeAllowedStudent(
  email: string,
  _prevState: RemoveAllowlistState,
  _formData: FormData,
): Promise<RemoveAllowlistState> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("allowed_students").delete().eq("email", email);

  if (error) {
    console.error("removeAllowedStudent: allowed_students delete failed", error);
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  return null;
}

export type BulkAllowlistState =
  | { error?: string; added?: number; skipped?: { line: string; reason: string }[] }
  | null;

// One row per line: email, name, roll no, experience -- the last two
// optional. Upserts on email so re-pasting an updated roster from the
// CDPO corrects existing rows instead of erroring on the duplicate key.
export async function bulkAddAllowedStudents(
  _prevState: BulkAllowlistState,
  formData: FormData,
): Promise<BulkAllowlistState> {
  const { supabase } = await requireAdmin();

  const raw = ((formData.get("bulk") as string) ?? "").trim();
  if (!raw) return { error: "Paste at least one line." };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: {
    email: string;
    name: string;
    roll_no: string | null;
    total_experience_years: number | null;
  }[] = [];
  const skipped: { line: string; reason: string }[] = [];
  const seenEmails = new Set<string>();

  for (const line of lines) {
    const [emailRaw, nameRaw, rollNoRaw, experienceRaw] = line.split(",").map((p) => p.trim());
    const email = (emailRaw ?? "").toLowerCase();

    if (!email || !email.includes("@")) {
      skipped.push({ line, reason: "Missing or invalid email" });
      continue;
    }
    if (!nameRaw) {
      skipped.push({ line, reason: "Missing name" });
      continue;
    }
    const experience = parseExperience(experienceRaw ?? "");
    if (!experience.ok) {
      skipped.push({ line, reason: experience.error });
      continue;
    }
    if (seenEmails.has(email)) {
      skipped.push({ line, reason: "Duplicate email in this paste" });
      continue;
    }
    seenEmails.add(email);

    rows.push({
      email,
      name: nameRaw,
      roll_no: rollNoRaw || null,
      total_experience_years: experience.value,
    });
  }

  if (rows.length === 0) {
    return { error: "No valid rows found.", skipped };
  }

  const { error } = await supabase.from("allowed_students").upsert(rows, { onConflict: "email" });

  if (error) {
    console.error("bulkAddAllowedStudents: allowed_students upsert failed", error);
    return { error: `Could not add: ${error.message}`, skipped };
  }

  revalidatePath("/admin/students");
  return { added: rows.length, skipped: skipped.length > 0 ? skipped : undefined };
}
