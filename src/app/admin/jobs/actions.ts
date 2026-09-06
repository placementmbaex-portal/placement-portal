"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { istDatetimeLocalToUtcIso } from "@/lib/format";

export type JobFormState = { error?: string } | null;

const MAX_JD_BYTES = 2 * 1024 * 1024;

function parseJobForm(formData: FormData) {
  const companyId = ((formData.get("company_id") as string) ?? "").trim();
  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const location = ((formData.get("location") as string) ?? "").trim();
  const deadlineLocal = ((formData.get("deadline") as string) ?? "").trim();
  const minExperienceRaw = (
    (formData.get("min_experience_years") as string) ?? ""
  ).trim();
  const isOpen = formData.get("is_open") === "on";

  return {
    companyId,
    title,
    description,
    location,
    deadlineLocal,
    minExperienceRaw,
    isOpen,
  };
}

function parseDeadline(deadlineLocal: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  if (!deadlineLocal) return { ok: true, value: null };

  const deadline = istDatetimeLocalToUtcIso(deadlineLocal);
  if (!deadline) return { ok: false, error: "Invalid deadline." };

  return { ok: true, value: deadline };
}

function parseMinExperience(minExperienceRaw: string):
  | { ok: true; value: number | null }
  | { ok: false; error: string } {
  if (!minExperienceRaw) return { ok: true, value: null };

  const parsed = Number(minExperienceRaw);
  if (Number.isNaN(parsed) || parsed < 0) {
    return {
      ok: false,
      error: "Minimum experience must be a positive number.",
    };
  }

  return { ok: true, value: parsed };
}

export async function createJob(
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { supabase } = await requireAdmin();

  const {
    companyId,
    title,
    description,
    location,
    deadlineLocal,
    minExperienceRaw,
    isOpen,
  } = parseJobForm(formData);

  if (!companyId) return { error: "Please choose a company." };
  if (!title) return { error: "Title is required." };

  const deadline = parseDeadline(deadlineLocal);
  if (!deadline.ok) return { error: deadline.error };

  const minExperienceYears = parseMinExperience(minExperienceRaw);
  if (!minExperienceYears.ok) return { error: minExperienceYears.error };

  let jdPath: string | null = null;
  const jdFile = formData.get("jd_file");
  if (jdFile instanceof File && jdFile.size > 0) {
    if (jdFile.type !== "application/pdf") {
      return { error: "The JD must be a PDF file." };
    }
    if (jdFile.size > MAX_JD_BYTES) {
      return { error: "The JD must be 2MB or smaller." };
    }

    jdPath = `${companyId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("jds")
      .upload(jdPath, jdFile, { contentType: "application/pdf" });
    if (uploadError) {
      return { error: "Could not upload the JD. Please try again." };
    }
  }

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    title,
    description: description || null,
    location: location || null,
    deadline: deadline.value,
    min_experience_years: minExperienceYears.value,
    is_open: isOpen,
    jd_path: jdPath,
  });

  if (error) {
    if (jdPath) await supabase.storage.from("jds").remove([jdPath]);
    return { error: "Could not create the job. Please try again." };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  redirect("/admin/jobs");
}

export async function updateJob(
  jobId: string,
  _prevState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { supabase } = await requireAdmin();

  const {
    companyId,
    title,
    description,
    location,
    deadlineLocal,
    minExperienceRaw,
    isOpen,
  } = parseJobForm(formData);

  if (!companyId) return { error: "Please choose a company." };
  if (!title) return { error: "Title is required." };

  const deadline = parseDeadline(deadlineLocal);
  if (!deadline.ok) return { error: deadline.error };

  const minExperienceYears = parseMinExperience(minExperienceRaw);
  if (!minExperienceYears.ok) return { error: minExperienceYears.error };

  const update: Record<string, unknown> = {
    company_id: companyId,
    title,
    description: description || null,
    location: location || null,
    deadline: deadline.value,
    min_experience_years: minExperienceYears.value,
    is_open: isOpen,
  };

  let newJdPath: string | null = null;
  const jdFile = formData.get("jd_file");
  if (jdFile instanceof File && jdFile.size > 0) {
    if (jdFile.type !== "application/pdf") {
      return { error: "The JD must be a PDF file." };
    }
    if (jdFile.size > MAX_JD_BYTES) {
      return { error: "The JD must be 2MB or smaller." };
    }

    newJdPath = `${companyId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("jds")
      .upload(newJdPath, jdFile, { contentType: "application/pdf" });
    if (uploadError) {
      return { error: "Could not upload the JD. Please try again." };
    }
    update.jd_path = newJdPath;
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("jd_path")
    .eq("id", jobId)
    .single();

  const { error } = await supabase
    .from("jobs")
    .update(update)
    .eq("id", jobId);

  if (error) {
    if (newJdPath) await supabase.storage.from("jds").remove([newJdPath]);
    return { error: "Could not save changes. Please try again." };
  }

  if (newJdPath && existingJob?.jd_path) {
    await supabase.storage.from("jds").remove([existingJob.jd_path]);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  redirect("/admin/jobs");
}

export async function toggleJobOpen(
  jobId: string,
  nextIsOpen: boolean,
  _formData: FormData,
) {
  const { supabase } = await requireAdmin();

  await supabase.from("jobs").update({ is_open: nextIsOpen }).eq("id", jobId);

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
}

export type DeleteJobState = { error?: string } | null;

export async function deleteJob(
  jobId: string,
  expectedTitle: string,
  _prevState: DeleteJobState,
  formData: FormData,
): Promise<DeleteJobState> {
  const { supabase } = await requireAdmin();

  const typed = ((formData.get("confirm_title") as string) ?? "").trim();
  if (typed !== expectedTitle) {
    return { error: "That doesn't match the role title. Nothing was deleted." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("jd_path")
    .eq("id", jobId)
    .single();

  // Applications (and their status history) cascade on delete; announcements
  // and events referencing this job have their job_id set to null rather
  // than being removed, per the FKs in schema.sql.
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) {
    return { error: "Could not delete the role. Please try again." };
  }

  if (job?.jd_path) {
    await supabase.storage.from("jds").remove([job.jd_path]);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/applications");
  revalidatePath("/calendar");
  revalidatePath("/announcements");
  redirect("/admin/jobs");
}
