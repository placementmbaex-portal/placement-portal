import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { JobForm } from "../../job-form";
import { updateJob } from "../../actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const [{ data: job }, { data: companies }, { data: setting }, { count: totalStudents }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, company_id, title, description, location, deadline, min_experience_years, is_open, jd_path",
        )
        .eq("id", id)
        .single(),
      supabase.from("companies").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("app_settings").select("value").eq("key", "whatsapp_template_job").single(),
      supabase.from("allowed_students").select("email", { count: "exact", head: true }),
    ]);

  if (!job) notFound();

  return (
    <main>
      <JobForm
        action={updateJob.bind(null, job.id)}
        companies={companies ?? []}
        defaultValues={job}
        whatsappTemplate={(setting?.value as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.job}
        totalStudents={totalStudents ?? 0}
      />
    </main>
  );
}
