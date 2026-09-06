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
    <main>
      <JobForm action={createJob} companies={companies ?? []} />
    </main>
  );
}
