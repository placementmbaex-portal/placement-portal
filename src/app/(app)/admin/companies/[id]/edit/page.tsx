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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Edit company
      </h1>
      <CompanyForm
        action={updateCompany.bind(null, company.id)}
        defaultValues={company}
      />
    </main>
  );
}
