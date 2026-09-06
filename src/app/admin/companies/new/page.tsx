import { requireAdmin } from "@/lib/supabase/require-admin";
import { CompanyForm } from "../company-form";
import { createCompany } from "../actions";

export default async function NewCompanyPage() {
  await requireAdmin();

  return (
    <main>
      <CompanyForm action={createCompany} />
    </main>
  );
}
