import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notify } from "@/lib/notify";
import { formatDateTimeIST } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-url";

// Vercel Cron hits this hourly (see vercel.json) with
// Authorization: Bearer $CRON_SECRET, which Vercel adds automatically when
// CRON_SECRET is set as an env var on the project. There is no admin
// session on this request at all, so it's the one legitimate place in the
// app that reaches for the service-role client directly (CLAUDE.md: only
// where RLS genuinely cannot express the rule).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, deadline, company:companies(name)")
    .eq("is_open", true)
    .is("deleted_at", null)
    .gt("deadline", now.toISOString())
    .lte("deadline", in24h.toISOString())
    .overrideTypes<
      { id: string; title: string; deadline: string; company: { name: string } | null }[],
      { merge: false }
    >();

  let notified = 0;

  for (const job of jobs ?? []) {
    const { data: students } = await supabase.from("students").select("id, email, email_notifications");
    const { data: applied } = await supabase
      .from("applications")
      .select("student_id")
      .eq("job_id", job.id);
    const appliedIds = new Set((applied ?? []).map((a) => a.student_id));

    const candidateIds = (students ?? [])
      .map((s) => s.id)
      .filter((id) => !appliedIds.has(id));
    if (candidateIds.length === 0) continue;

    // Idempotency: a job sits inside the 24h window for every hourly run
    // until it applies or closes, so this alone -- not the window itself --
    // is what guarantees a student is never reminded twice for the same
    // job (PRD 5.2's own acceptance criterion).
    const { data: alreadyNotified } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "deadline_reminder")
      .eq("link", `/jobs/${job.id}`)
      .in("user_id", candidateIds);
    const alreadyNotifiedIds = new Set((alreadyNotified ?? []).map((n) => n.user_id));

    const studentIds = candidateIds.filter((id) => !alreadyNotifiedIds.has(id));
    if (studentIds.length === 0) continue;

    const companyName = job.company?.name ?? "This company";
    const title = `Deadline in 24 hours: ${job.title}`;
    const body = `${companyName} closes ${formatDateTimeIST(job.deadline)} IST.`;

    await notify(supabase, {
      studentIds,
      type: "deadline_reminder",
      title,
      body,
      link: `/jobs/${job.id}`,
      ignoreEmailToggle: true,
      email: {
        subject: title,
        html: `<p>${body}</p><p><a href="${absoluteUrl(`/jobs/${job.id}`)}">Apply now</a></p>`,
      },
    });
    notified += studentIds.length;
  }

  return NextResponse.json({ jobsChecked: jobs?.length ?? 0, notified });
}
