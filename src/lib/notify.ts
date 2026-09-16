import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/site-url";

export type NotifyEmail = { subject: string; html: string };

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
// off/test/live safety mode.
export async function notify(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { studentIds, type, title, body, link, email, ignoreEmailToggle }: NotifyParams,
) {
  if (studentIds.length === 0) return;

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

  if (!email) return;

  const { data: recipients } = await supabase
    .from("students")
    .select("id, email, email_notifications")
    .in("id", studentIds);

  for (const recipient of recipients ?? []) {
    if (!ignoreEmailToggle && !recipient.email_notifications) continue;
    await sendEmail(supabase, {
      studentId: recipient.id,
      to: recipient.email,
      subject: email.subject,
      html: email.html,
    });
  }
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
