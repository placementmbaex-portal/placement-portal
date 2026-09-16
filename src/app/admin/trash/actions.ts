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
  revalidatePath("/admin/trash");
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
  revalidatePath("/admin/trash");
  revalidatePath("/");
  revalidatePath("/jobs");
  return null;
}

export type PermanentDeleteState = { error?: string } | null;

// Real DELETEs. Only ever reachable from /admin/trash, and only once
// deletion_impact reports zero applications -- re-checked here, not just
// trusted from the list that rendered the button.
export async function permanentlyDeleteCompany(
  companyId: string,
  expectedName: string,
  _prevState: PermanentDeleteState,
  formData: FormData,
): Promise<PermanentDeleteState> {
  const { supabase } = await requireAdmin();

  const typed = ((formData.get("confirm_name") as string) ?? "").trim();
  if (typed !== expectedName) {
    return { error: "That doesn't match the company name. Nothing was deleted." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("deleted_at")
    .eq("id", companyId)
    .single();

  if (!company?.deleted_at) {
    return { error: "Only trashed companies can be permanently deleted." };
  }

  const { data: impact, error: impactError } = await supabase.rpc("deletion_impact", {
    p_kind: "company",
    p_id: companyId,
  });

  if (impactError) {
    console.error("permanentlyDeleteCompany: deletion_impact failed", impactError);
    return { error: `Could not check what this would affect: ${impactError.message}` };
  }
  if ((impact?.applications ?? 0) > 0) {
    return {
      error: "This company still has applications on record and can't be permanently deleted.",
    };
  }

  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) {
    console.error("permanentlyDeleteCompany: companies delete failed", error);
    return { error: `Could not permanently delete: ${error.message}` };
  }

  revalidatePath("/admin/trash");
  revalidatePath("/admin/companies");
  redirect("/admin/trash");
}

export async function permanentlyDeleteJob(
  jobId: string,
  expectedTitle: string,
  _prevState: PermanentDeleteState,
  formData: FormData,
): Promise<PermanentDeleteState> {
  const { supabase } = await requireAdmin();

  const typed = ((formData.get("confirm_title") as string) ?? "").trim();
  if (typed !== expectedTitle) {
    return { error: "That doesn't match the role title. Nothing was deleted." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("deleted_at, jd_path")
    .eq("id", jobId)
    .single();

  if (!job?.deleted_at) {
    return { error: "Only trashed roles can be permanently deleted." };
  }

  const { data: impact, error: impactError } = await supabase.rpc("deletion_impact", {
    p_kind: "job",
    p_id: jobId,
  });

  if (impactError) {
    console.error("permanentlyDeleteJob: deletion_impact failed", impactError);
    return { error: `Could not check what this would affect: ${impactError.message}` };
  }
  if ((impact?.applications ?? 0) > 0) {
    return {
      error: "This role still has applications on record and can't be permanently deleted.",
    };
  }

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) {
    console.error("permanentlyDeleteJob: jobs delete failed", error);
    return { error: `Could not permanently delete: ${error.message}` };
  }

  if (job.jd_path) {
    await supabase.storage.from("jds").remove([job.jd_path]);
  }

  revalidatePath("/admin/trash");
  revalidatePath("/admin/jobs");
  redirect("/admin/trash");
}
