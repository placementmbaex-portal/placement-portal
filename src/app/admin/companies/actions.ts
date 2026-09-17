"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type CompanyFormState = { error?: string } | null;

function parseCompanyForm(formData: FormData) {
  const name = ((formData.get("name") as string) ?? "").trim();
  const sector = ((formData.get("sector") as string) ?? "").trim();
  const about = ((formData.get("about") as string) ?? "").trim();
  const logoUrl = ((formData.get("logo_url") as string) ?? "").trim();
  const tags = ((formData.get("tags") as string) ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const isLegacyRecruiter = formData.get("is_legacy_recruiter") === "on";

  return {
    name,
    sector: sector || null,
    about: about || null,
    logo_url: logoUrl || null,
    tags,
    is_legacy_recruiter: isLegacyRecruiter,
  };
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const { supabase } = await requireAdmin();
  const values = parseCompanyForm(formData);

  if (!values.name) return { error: "Name is required." };

  const { error } = await supabase.from("companies").insert(values);
  if (error) {
    console.error("createCompany: companies insert failed", error);
    return { error: `Could not create the company: ${error.message}` };
  }

  revalidatePath("/admin/companies");
  redirect("/admin/companies");
}

export async function updateCompany(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const { supabase } = await requireAdmin();
  const values = parseCompanyForm(formData);

  if (!values.name) return { error: "Name is required." };

  const { error } = await supabase
    .from("companies")
    .update(values)
    .eq("id", companyId);
  if (error) {
    console.error("updateCompany: companies update failed", error);
    return { error: `Could not save changes: ${error.message}` };
  }

  revalidatePath("/admin/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect("/admin/companies");
}

export type DeleteCompanyState = { error?: string } | null;

// Soft delete only -- see the comment on deleteJob in admin/jobs/actions.ts
// for why a real DELETE isn't used, and why this needs only a single
// confirmation rather than a retyped name. Deleting a company also hides
// its still-live jobs, stamped with the same deleted_at so restoreCompany
// can find exactly the jobs this cascade hid and no others.
export async function deleteCompany(
  companyId: string,
  _prevState: DeleteCompanyState,
  _formData: FormData,
): Promise<DeleteCompanyState> {
  const { supabase, user } = await requireAdmin();

  const deletedAt = new Date().toISOString();

  const { error } = await supabase
    .from("companies")
    .update({ deleted_at: deletedAt, deleted_by: user.id })
    .eq("id", companyId);

  if (error) {
    console.error("deleteCompany: companies soft-delete failed", error);
    return { error: `Could not delete the company: ${error.message}` };
  }

  const { error: jobsError } = await supabase
    .from("jobs")
    .update({ deleted_at: deletedAt, deleted_by: user.id })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (jobsError) {
    console.error("deleteCompany: jobs cascade soft-delete failed", jobsError);
    return {
      error: `The company was deleted, but its jobs could not be hidden: ${jobsError.message}`,
    };
  }

  revalidatePath("/admin/companies");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/companies/${companyId}`);
  redirect("/admin/companies");
}
