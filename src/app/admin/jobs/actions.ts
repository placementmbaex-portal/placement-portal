"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { istDatetimeLocalToUtcIso } from "@/lib/format";
import { notifyJobOpened } from "@/lib/notify";

export type JobFormState =
  | { error: string }
  | {
      success: true;
      job: {
        id: string;
        title: string;
        companyName: string;
        location: string | null;
        deadline: string | null;
      };
    }
  | null;

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
      console.error("createJob: jds upload failed", uploadError);
      return { error: `Could not upload the JD: ${uploadError.message}` };
    }
  }

  const { data: created, error } = await supabase
    .from("jobs")
    .insert({
      company_id: companyId,
      title,
      description: description || null,
      location: location || null,
      deadline: deadline.value,
      min_experience_years: minExperienceYears.value,
      is_open: isOpen,
      jd_path: jdPath,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createJob: jobs insert failed", error);
    if (jdPath) await supabase.storage.from("jds").remove([jdPath]);
    return { error: `Could not create the job: ${error.message}` };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");

  if (isOpen && created) {
    await notifyJobOpened(supabase, created.id);
    await supabase
      .from("jobs")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", created.id);

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    return {
      success: true,
      job: {
        id: created.id,
        title,
        companyName: company?.name ?? "",
        location: location || null,
        deadline: deadline.value,
      },
    };
  }

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
      console.error("updateJob: jds upload failed", uploadError);
      return { error: `Could not upload the JD: ${uploadError.message}` };
    }
    update.jd_path = newJdPath;
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("jd_path, is_open")
    .eq("id", jobId)
    .single();

  const { error } = await supabase
    .from("jobs")
    .update(update)
    .eq("id", jobId);

  if (error) {
    console.error("updateJob: jobs update failed", error);
    if (newJdPath) await supabase.storage.from("jds").remove([newJdPath]);
    return { error: `Could not save changes: ${error.message}` };
  }

  if (newJdPath && existingJob?.jd_path) {
    await supabase.storage.from("jds").remove([existingJob.jd_path]);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/events");
  revalidatePath("/admin");

  const justOpened = isOpen && !existingJob?.is_open;
  if (justOpened) {
    await notifyJobOpened(supabase, jobId);
    await supabase
      .from("jobs")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", jobId);

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    return {
      success: true,
      job: {
        id: jobId,
        title,
        companyName: company?.name ?? "",
        location: location || null,
        deadline: deadline.value,
      },
    };
  }

  redirect("/admin/jobs");
}

export async function toggleJobOpen(
  jobId: string,
  nextIsOpen: boolean,
  _formData: FormData,
) {
  const { supabase } = await requireAdmin();

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("is_open")
    .eq("id", jobId)
    .single();

  const { error } = await supabase
    .from("jobs")
    .update({ is_open: nextIsOpen })
    .eq("id", jobId);
  if (error) {
    console.error("toggleJobOpen: jobs update failed", error);
    return;
  }

  if (nextIsOpen && !existingJob?.is_open) {
    await notifyJobOpened(supabase, jobId);
    await supabase
      .from("jobs")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/events");
  revalidatePath("/admin");
}

export type DeleteJobState = { error?: string } | null;

// Soft delete only -- a real DELETE cascades to applications and events
// (schema.sql's FKs) and would destroy application history. Setting
// deleted_at/deleted_by hides the role from every list and from RLS
// (jobs_read) without touching a single other row; /admin/settings/trash is where
// it can be restored or, once it has zero applications, hard-deleted for
// real.
export async function deleteJob(
  jobId: string,
  expectedTitle: string,
  _prevState: DeleteJobState,
  formData: FormData,
): Promise<DeleteJobState> {
  const { supabase, user } = await requireAdmin();

  const typed = ((formData.get("confirm_title") as string) ?? "").trim();
  if (typed !== expectedTitle) {
    return { error: "That doesn't match the role title. Nothing was deleted." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", jobId);

  if (error) {
    console.error("deleteJob: jobs soft-delete failed", error);
    return { error: `Could not delete the role: ${error.message}` };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/applications");
  revalidatePath("/events");
  revalidatePath("/announcements");
  revalidatePath("/admin");
  redirect("/admin/jobs");
}

// Both copy and open count as "shared" (WhatsAppShare calls this from
// either action) -- never cleared automatically, so it answers "has this
// ever been shared," not "was it shared for the most recent change."
export async function markJobsWhatsAppShared(jobIds: string[]) {
  const { supabase } = await requireAdmin();
  if (jobIds.length === 0) return;

  const { error } = await supabase
    .from("jobs")
    .update({ whatsapp_shared_at: new Date().toISOString() })
    .in("id", jobIds);
  if (error) console.error("markJobsWhatsAppShared: jobs update failed", error);

  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
}

export async function markJobWhatsAppShared(jobId: string) {
  return markJobsWhatsAppShared([jobId]);
}
