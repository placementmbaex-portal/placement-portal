import { requireAdmin } from "@/lib/supabase/require-admin";
import { JobForm } from "../job-form";
import { createJob } from "../actions";

export default async function NewJobPage() {
  const { supabase } = await requireAdmin();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        New job
      </h1>
      <JobForm action={createJob} companies={companies ?? []} />
    </main>
  );
}
