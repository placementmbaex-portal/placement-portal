import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/site-url";

export type NotifyEmail = { subject: string; html: string };

export type NotifyEmailOutcome = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  toEmail: string;
  status: "sent" | "suppressed" | "failed";
  error?: string;
};

export type NotifyResult = {
  notifiedCount: number;
  emailOutcomes: NotifyEmailOutcome[];
  // Students with email_notifications off who were never sent an email
  // attempt at all -- no email_log row exists for them, so they can't
  // appear in emailOutcomes; callers that show results to an admin (the
  // announcement composer) surface this count so the numbers add up.
  skippedForEmailToggle: number;
};

type NotifyParams = {
  studentIds: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  email?: NotifyEmail;
  // The one exception to the student's own email toggle: deadline
  // reminders stay on regardless (PRD 5.2).
  ignoreEmailToggle?: boolean;
};

// The one function every trigger site goes through. The in-app
// notifications row is written unconditionally -- it costs nothing and is
// always safe -- while email is opt-in per call, gated by each recipient's
// own students.email_notifications, and routed through sendEmail's
// off/test/live safety mode. Returns what happened so a caller that shows
// results to an admin (the announcement composer) doesn't have to re-query.
export async function notify(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { studentIds, type, title, body, link, email, ignoreEmailToggle }: NotifyParams,
): Promise<NotifyResult> {
  if (studentIds.length === 0) {
    return { notifiedCount: 0, emailOutcomes: [], skippedForEmailToggle: 0 };
  }

  const { error: notifyError } = await supabase.from("notifications").insert(
    studentIds.map((user_id) => ({
      user_id,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    })),
  );
  if (notifyError) {
    console.error("notify: notifications insert failed", notifyError);
  }

  const result: NotifyResult = { notifiedCount: studentIds.length, emailOutcomes: [], skippedForEmailToggle: 0 };
  if (!email) return result;

  const { data: recipients } = await supabase
    .from("students")
    .select("id, name, email, email_notifications")
    .in("id", studentIds);

  for (const recipient of recipients ?? []) {
    if (!ignoreEmailToggle && !recipient.email_notifications) {
      result.skippedForEmailToggle += 1;
      continue;
    }
    const outcome = await sendEmail(supabase, {
      studentId: recipient.id,
      to: recipient.email,
      subject: email.subject,
      html: email.html,
    });
    result.emailOutcomes.push({
      studentId: recipient.id,
      studentName: recipient.name,
      studentEmail: recipient.email,
      toEmail: outcome.to_email,
      status: outcome.status,
      error: outcome.error,
    });
  }

  return result;
}

// "New job opened" (PRD 5.2): every student meeting the role's own
// min_experience_years, using the same >= comparison the student-facing
// job list already applies (a null bar means everyone qualifies; a null
// total_experience_years counts as 0) -- so this never notifies someone
// the job page itself would mark not eligible.
export async function notifyJobOpened(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  jobId: string,
) {
  const { data: job } = await supabase
    .from("jobs")
    .select("title, min_experience_years, company:companies(name)")
    .eq("id", jobId)
    .single()
    .overrideTypes<
      { title: string; min_experience_years: number | null; company: { name: string } | null },
      { merge: false }
    >();
  if (!job) return;

  const { data: students } = await supabase
    .from("students")
    .select("id, total_experience_years");

  const eligibleIds = (students ?? [])
    .filter(
      (s) =>
        job.min_experience_years == null ||
        (s.total_experience_years ?? 0) >= job.min_experience_years,
    )
    .map((s) => s.id);
  if (eligibleIds.length === 0) return;

  const companyName = job.company?.name ?? "A company";
  const title = `New role: ${job.title}`;
  const body = `${companyName} is hiring for ${job.title}.`;

  await notify(supabase, {
    studentIds: eligibleIds,
    type: "job_opened",
    title,
    body,
    link: `/jobs/${jobId}`,
    email: {
      subject: title,
      html: `<p>${body}</p><p><a href="${absoluteUrl(`/jobs/${jobId}`)}">View the role</a></p>`,
    },
  });
}
