import { requireAdmin } from "@/lib/supabase/require-admin";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { JobForm } from "../job-form";
import { createJob } from "../actions";

export default async function NewJobPage() {
  const { supabase } = await requireAdmin();

  const [{ data: companies }, { data: setting }, { count: totalStudents }] = await Promise.all([
    supabase.from("companies").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("app_settings").select("value").eq("key", "whatsapp_template_job").single(),
    supabase.from("allowed_students").select("email", { count: "exact", head: true }),
  ]);

  return (
    <main>
      <JobForm
        action={createJob}
        companies={companies ?? []}
        whatsappTemplate={(setting?.value as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.job}
        totalStudents={totalStudents ?? 0}
      />
    </main>
  );
}
