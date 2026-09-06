import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { JobForm } from "../../job-form";
import { updateJob } from "../../actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const [{ data: job }, { data: companies }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, company_id, title, description, location, deadline, min_experience_years, is_open, jd_path",
      )
      .eq("id", id)
      .single(),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  if (!job) notFound();

  return (
    <main>
      <JobForm
        action={updateJob.bind(null, job.id)}
        companies={companies ?? []}
        defaultValues={job}
      />
    </main>
  );
}
