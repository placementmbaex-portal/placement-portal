"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type RestoreState = { error?: string } | null;

export async function restoreCompany(
  companyId: string,
  _prevState: RestoreState,
  _formData: FormData,
): Promise<RestoreState> {
  const { supabase } = await requireAdmin();

  const { data: company } = await supabase
    .from("companies")
    .select("deleted_at")
    .eq("id", companyId)
    .single();

  if (!company?.deleted_at) return { error: "This company isn't in trash." };

  const { error } = await supabase
    .from("companies")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", companyId);

  if (error) {
    console.error("restoreCompany: companies update failed", error);
    return { error: `Could not restore the company: ${error.message}` };
  }

  // Bring back exactly the jobs this company's own delete hid -- matched
  // by the identical deleted_at timestamp deleteCompany stamped them
  // with, not a job that happened to be deleted independently.
  const { error: jobsError } = await supabase
    .from("jobs")
    .update({ deleted_at: null, deleted_by: null })
    .eq("company_id", companyId)
    .eq("deleted_at", company.deleted_at);

  if (jobsError) {
    console.error("restoreCompany: jobs restore failed", jobsError);
  }

  revalidatePath("/admin/companies");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  return null;
}

export async function restoreJob(
  jobId: string,
  _prevState: RestoreState,
  _formData: FormData,
): Promise<RestoreState> {
  const { supabase } = await requireAdmin();

  const { data: job } = await supabase
    .from("jobs")
    .select("company:companies(deleted_at)")
    .eq("id", jobId)
    .single()
    .overrideTypes<{ company: { deleted_at: string | null } | null }, { merge: false }>();

  if (job?.company?.deleted_at) {
    return { error: "This role's company is also in trash. Restore the company first." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", jobId);

  if (error) {
    console.error("restoreJob: jobs update failed", error);
    return { error: `Could not restore the role: ${error.message}` };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  revalidatePath("/jobs");
  return null;
}

export async function restoreAnnouncement(
  announcementId: string,
  _prevState: RestoreState,
  _formData: FormData,
): Promise<RestoreState> {
  const { supabase } = await requireAdmin();

  const { data: announcement } = await supabase
    .from("announcements")
    .select("deleted_at")
    .eq("id", announcementId)
    .single();

  if (!announcement?.deleted_at) return { error: "This announcement isn't in trash." };

  const { error } = await supabase
    .from("announcements")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", announcementId);

  if (error) {
    console.error("restoreAnnouncement: announcements update failed", error);
    return { error: `Could not restore the announcement: ${error.message}` };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  revalidatePath("/announcements");
  return null;
}

export type PermanentDeleteState = { error?: string } | null;

// Calls the real permanently_delete_company() RPC (schema_r4.sql) rather
// than a raw .delete() -- it snapshots the company and its jobs into
// deletion_log, then does the retype-matches-name check itself and raises
// on a mismatch. Available for any trashed company regardless of how many
// applications are on record: that's the whole point of a permanent
// delete, and the retyped name is the only gate. Whatever message the
// function raises (mismatch, not found) is returned as-is, not replaced
// with a generic failure.
export async function permanentlyDeleteCompany(
  companyId: string,
  _prevState: PermanentDeleteState,
  formData: FormData,
): Promise<PermanentDeleteState> {
  const { supabase } = await requireAdmin();

  const { data: company } = await supabase
    .from("companies")
    .select("deleted_at")
    .eq("id", companyId)
    .single();

  if (!company?.deleted_at) {
    return { error: "Only trashed companies can be permanently deleted." };
  }

  const confirmName = ((formData.get("confirm_name") as string) ?? "").trim();

  const { error } = await supabase.rpc("permanently_delete_company", {
    p_company_id: companyId,
    p_confirm_name: confirmName,
  });

  if (error) {
    console.error("permanentlyDeleteCompany: rpc failed", error);
    return { error: error.message };
  }

  revalidatePath("/admin/settings/trash");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  redirect("/admin/settings/trash");
}

// Same pattern as permanentlyDeleteCompany, calling permanently_delete_job()
// (schema_r4.sql). The JD file lives in Storage, outside the RPC's reach,
// so it's read before the row is destroyed and removed only once the RPC
// confirms the delete went through.
export async function permanentlyDeleteJob(
  jobId: string,
  _prevState: PermanentDeleteState,
  formData: FormData,
): Promise<PermanentDeleteState> {
  const { supabase } = await requireAdmin();

  const { data: job } = await supabase
    .from("jobs")
    .select("deleted_at, jd_path")
    .eq("id", jobId)
    .single();

  if (!job?.deleted_at) {
    return { error: "Only trashed roles can be permanently deleted." };
  }

  const confirmTitle = ((formData.get("confirm_title") as string) ?? "").trim();

  const { error } = await supabase.rpc("permanently_delete_job", {
    p_job_id: jobId,
    p_confirm_title: confirmTitle,
  });

  if (error) {
    console.error("permanentlyDeleteJob: rpc failed", error);
    return { error: error.message };
  }

  if (job.jd_path) {
    await supabase.storage.from("jds").remove([job.jd_path]);
  }

  revalidatePath("/admin/settings/trash");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  redirect("/admin/settings/trash");
}

// Unlike the company/job pair above, this calls the real
// permanently_delete_announcement() RPC rather than a raw .delete() --
// it snapshots the announcement and its comment count into deletion_log
// before destroying anything, which is why the RPC needs no retyped
// confirmation text: the modal itself is the confirmation.
export async function permanentlyDeleteAnnouncement(
  announcementId: string,
  _prevState: PermanentDeleteState,
  _formData: FormData,
): Promise<PermanentDeleteState> {
  const { supabase } = await requireAdmin();

  const { data: announcement } = await supabase
    .from("announcements")
    .select("deleted_at")
    .eq("id", announcementId)
    .single();

  if (!announcement?.deleted_at) {
    return { error: "Only trashed announcements can be permanently deleted." };
  }

  const { error } = await supabase.rpc("permanently_delete_announcement", {
    p_id: announcementId,
  });

  if (error) {
    console.error("permanentlyDeleteAnnouncement: rpc failed", error);
    return { error: `Could not permanently delete: ${error.message}` };
  }

  revalidatePath("/admin/settings/trash");
  revalidatePath("/admin/announcements");
  redirect("/admin/settings/trash");
}
