"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function viewApplicantCv(
  jobId: string,
  filePath: string,
  _formData: FormData,
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(filePath, 60);

  if (error || !data) redirect(`/admin/jobs/${jobId}/applicants`);

  redirect(data.signedUrl);
}
