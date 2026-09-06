"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ApplicationStatus } from "@/lib/format";

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

const VALID_STATUSES: ApplicationStatus[] = [
  "applied",
  "shortlisted",
  "in_process",
  "offer",
  "not_selected",
];

export type BulkStatusState = { error?: string } | null;

export async function bulkUpdateStatus(
  jobId: string,
  _prevState: BulkStatusState,
  formData: FormData,
): Promise<BulkStatusState> {
  const { supabase } = await requireAdmin();

  const applicationIds = formData
    .getAll("application_ids")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const status = (formData.get("status") as string) ?? "";

  if (applicationIds.length === 0) {
    return { error: "Select at least one applicant." };
  }
  if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
    return { error: "Choose a status." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("job_id", jobId)
    .in("id", applicationIds);

  if (error) {
    return { error: "Could not update status. Please try again." };
  }

  revalidatePath(`/admin/jobs/${jobId}/applicants`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  revalidatePath("/applications");
  return null;
}

type MatchedApplicant = {
  applicationId: string;
  name: string;
  rollNo: string | null;
};

export type ShortlistPreviewState = {
  error?: string;
  matched?: MatchedApplicant[];
  unmatched?: string[];
} | null;

// Pasted text and an uploaded CSV are treated as the same kind of input --
// a list of identifiers, one per line. For a CSV, only the first column of
// each row is read; this isn't a full CSV parser, just enough to handle a
// plain list or a simple "email,name"-style export.
async function readIdentifiers(formData: FormData): Promise<string[]> {
  const lines: string[] = [];

  const pasted = ((formData.get("identifiers") as string) ?? "").trim();
  if (pasted) lines.push(...pasted.split(/\r?\n/));

  const file = formData.get("csv");
  if (file instanceof File && file.size > 0) {
    const text = await file.text();
    for (const row of text.split(/\r?\n/)) {
      const firstCell = row.split(",")[0];
      if (firstCell) lines.push(firstCell);
    }
  }

  return lines.map((line) => line.trim()).filter(Boolean);
}

export async function previewShortlist(
  jobId: string,
  _prevState: ShortlistPreviewState,
  formData: FormData,
): Promise<ShortlistPreviewState> {
  const { supabase } = await requireAdmin();

  const identifiers = await readIdentifiers(formData);
  if (identifiers.length === 0) {
    return {
      error: "Enter at least one email or roll number, or upload a CSV.",
    };
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id, student:students(name, email, roll_no)")
    .eq("job_id", jobId)
    .overrideTypes<
      {
        id: string;
        student: { name: string; email: string; roll_no: string | null } | null;
      }[],
      { merge: false }
    >();

  const applicants = (applications ?? [])
    .filter((a) => a.student)
    .map((a) => ({
      applicationId: a.id,
      name: a.student!.name,
      email: a.student!.email,
      rollNo: a.student!.roll_no,
    }));

  const matchedById = new Map<string, MatchedApplicant>();
  const unmatched = new Set<string>();

  // Matching is scoped to this job's applicants only, never the wider
  // student roster -- an email that never applied here is reported as
  // unmatched, not resolved against some other application.
  for (const identifier of identifiers) {
    const normalized = identifier.toLowerCase();
    const match = identifier.includes("@")
      ? applicants.find((a) => a.email.toLowerCase() === normalized)
      : applicants.find((a) => (a.rollNo ?? "").toLowerCase() === normalized);

    if (match) {
      matchedById.set(match.applicationId, {
        applicationId: match.applicationId,
        name: match.name,
        rollNo: match.rollNo,
      });
    } else {
      unmatched.add(identifier);
    }
  }

  return {
    matched: Array.from(matchedById.values()),
    unmatched: Array.from(unmatched),
  };
}

export type ShortlistConfirmState = { error?: string; success?: boolean } | null;

export async function confirmShortlist(
  jobId: string,
  _prevState: ShortlistConfirmState,
  formData: FormData,
): Promise<ShortlistConfirmState> {
  const { supabase } = await requireAdmin();

  const applicationIds = formData
    .getAll("application_ids")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (applicationIds.length === 0) {
    return { error: "Nothing to confirm." };
  }

  const { data: updated, error } = await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("job_id", jobId)
    .in("id", applicationIds)
    .select("student_id");

  if (error) {
    return { error: "Could not update status. Please try again." };
  }

  if (updated && updated.length > 0) {
    const { data: job } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", jobId)
      .single();

    // One notification row per student, written now so 5.2's eventual
    // in-app panel / email delivery has something to read -- this task
    // doesn't build that delivery UI, only the "fires once per student"
    // half of the criterion.
    await supabase.from("notifications").insert(
      updated.map((row) => ({
        user_id: row.student_id,
        type: "application_status_changed",
        title: "You've been shortlisted",
        body: job?.title
          ? `You've been shortlisted for ${job.title}.`
          : "You've been shortlisted.",
        link: `/jobs/${jobId}`,
      })),
    );
  }

  revalidatePath(`/admin/jobs/${jobId}/applicants`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  revalidatePath("/applications");
  return { success: true };
}
