import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { CompanyForm } from "../../company-form";
import { updateCompany } from "../../actions";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, sector, about, tags, is_legacy_recruiter, logo_url")
    .eq("id", id)
    .single();

  if (!company) notFound();

  return (
    <main>
      <CompanyForm
        action={updateCompany.bind(null, company.id)}
        defaultValues={company}
      />
    </main>
  );
}
