import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatApplicationStatus,
  formatDateIST,
  formatCountdown,
  formatDateTimeIST,
  getDeadlineUrgency,
} from "@/lib/format";
import { CompanyLogo } from "@/components/company-logo";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ApplyDialog } from "./apply-dialog";
import { viewJd, withdrawApplication } from "./actions";

type JobDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  jd_path: string | null;
  deadline: string | null;
  is_open: boolean;
  min_experience_years: number | null;
  company: { id: string; name: string; logo_url: string | null } | null;
};

type ApplicationWithCv = {
  id: string;
  applied_at: string;
  status: string;
  status_changed_at: string;
  cv: { label: string } | null;
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location, jd_path, deadline, is_open, min_experience_years, company:companies(id, name, logo_url)",
    )
    .eq("id", id)
    .single()
    .overrideTypes<JobDetail, { merge: false }>();

  if (!job) notFound();

  const [{ data: student }, { data: cvs }, { data: application }] =
    await Promise.all([
      supabase
        .from("students")
        .select("total_experience_years")
        .eq("id", user.id)
        .single(),
      supabase
        .from("cvs")
        .select("id, label")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("id, applied_at, status, status_changed_at, cv:cvs(label)")
        .eq("job_id", id)
        .eq("student_id", user.id)
        .maybeSingle()
        .overrideTypes<ApplicationWithCv, { merge: false }>(),
    ]);

  const cvList = cvs ?? [];
  const deadlinePassed = job.deadline
    ? new Date(job.deadline) <= new Date()
    : false;
  const experienceShortfall =
    job.min_experience_years != null &&
    (student?.total_experience_years ?? 0) < job.min_experience_years;

  const reasons: string[] = [];
  if (!job.is_open) reasons.push("This job is closed.");
  if (deadlinePassed) reasons.push("The deadline for this job has passed.");
  if (experienceShortfall)
    reasons.push(
      `Requires at least ${job.min_experience_years} years of experience.`,
    );
  if (cvList.length === 0) reasons.push("Upload a CV before applying.");

  const urgency = getDeadlineUrgency(job.deadline);
  const countdownColor = urgency === "urgent" ? "text-closing" : "text-slate";

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <Link
          href={`/companies/${job.company?.id}`}
          className="text-[13.5px] leading-[1.45] text-slate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ← {job.company?.name}
        </Link>

        <div className="mt-4 flex items-start gap-4">
          <CompanyLogo
            name={job.company?.name}
            logoUrl={job.company?.logo_url}
          />
          <div className="min-w-0">
            <h1 className="font-display text-[30px] leading-[1.15] font-semibold text-ink">
              {job.title}
            </h1>
            {job.location && (
              <p className="mt-1 text-[13.5px] leading-[1.45] text-slate">
                {job.location}
              </p>
            )}
          </div>
        </div>

        <p
          className={`mt-4 text-[13.5px] leading-[1.4] font-medium tabular-nums ${countdownColor}`}
        >
          {job.deadline
            ? `${formatCountdown(job.deadline)} · ${formatDateTimeIST(job.deadline)} IST`
            : "No deadline"}
        </p>
      </div>

      {job.description && (
        <p className="max-w-[68ch] whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
          {job.description}
        </p>
      )}

      {job.jd_path && (
        <form action={viewJd.bind(null, job.id, job.jd_path)}>
          <button
            type="submit"
            formTarget="_blank"
            className="flex h-10 items-center rounded-md border border-navy px-4 text-[15px] font-medium text-navy hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            View JD
          </button>
        </form>
      )}

      <div>
        {application ? (
          <div className="space-y-3">
            <p className="text-[15px] leading-[1.55] text-ink">
              You applied with{" "}
              <span className="font-medium">{application.cv?.label}</span> on{" "}
              {formatDateIST(application.applied_at)}.
            </p>
            <p className="text-[15px] leading-[1.55] text-ink">
              Status: {formatApplicationStatus(application.status)}
              <span className="text-slate">
                {" "}
                · Updated {formatDateIST(application.status_changed_at)}
              </span>
            </p>
            {!deadlinePassed && (
              <form action={withdrawApplication.bind(null, application.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Withdraw this application? This cannot be undone."
                  pendingLabel="Withdrawing…"
                  className="text-[15px] font-medium text-closing underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
                >
                  Withdraw
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        ) : reasons.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[15px] leading-[1.55] text-ink">
              You can&apos;t apply to this job yet:
            </p>
            <ul className="list-inside list-disc space-y-1 text-[15px] leading-[1.55] text-slate">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <ApplyDialog jobId={job.id} cvs={cvList} />
        )}
      </div>
    </main>
  );
}
