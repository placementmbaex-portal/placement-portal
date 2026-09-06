import { requireAdmin } from "@/lib/supabase/require-admin";
import { CompanyForm } from "../company-form";
import { createCompany } from "../actions";

export default async function NewCompanyPage() {
  await requireAdmin();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        New company
      </h1>
      <CompanyForm action={createCompany} />
    </main>
  );
}
