"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ApplyState = { error?: string } | null;

export async function applyToJob(
  jobId: string,
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cvId = formData.get("cv_id");
  if (typeof cvId !== "string" || !cvId) {
    return { error: "Please choose a CV." };
  }

  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    student_id: user.id,
    cv_id: cvId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already applied to this job." };
    }
    // Surfaces the guard_application trigger's own message (closed job,
    // deadline passed, experience shortfall) verbatim.
    return { error: error.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  revalidatePath("/applications");
  return null;
}

export async function withdrawApplication(
  applicationId: string,
  _formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select("job_id, job:jobs(deadline)")
    .eq("id", applicationId)
    .eq("student_id", user.id)
    .single()
    .overrideTypes<
      { job_id: string; job: { deadline: string | null } | null },
      { merge: false }
    >();

  if (!application) return;

  const deadline = application.job?.deadline;
  if (deadline && new Date(deadline) <= new Date()) {
    // The deadline has passed since the page was rendered; the UI
    // shouldn't have shown the button, so just no-op.
    return;
  }

  await supabase.from("applications").delete().eq("id", applicationId);

  revalidatePath(`/jobs/${application.job_id}`);
  revalidatePath("/");
  revalidatePath("/applications");
}

export async function viewJd(
  jobId: string,
  jdPath: string,
  _formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.storage
    .from("jds")
    .createSignedUrl(jdPath, 60);

  if (error || !data) redirect(`/jobs/${jobId}`);

  redirect(data.signedUrl);
}
