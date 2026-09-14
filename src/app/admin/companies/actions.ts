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
