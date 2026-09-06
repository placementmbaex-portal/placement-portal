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
        .select("id, label, created_at")
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
  const experience = student?.total_experience_years ?? 0;
  const deadlinePassed = job.deadline
    ? new Date(job.deadline) <= new Date()
    : false;
  const experienceShortfall =
    job.min_experience_years != null && experience < job.min_experience_years;

  const reasons: string[] = [];
  if (!job.is_open) reasons.push("This job is closed.");
  if (deadlinePassed) reasons.push("The deadline for this job has passed.");
  if (experienceShortfall)
    reasons.push(
      `Requires at least ${job.min_experience_years} years of experience.`,
    );
  if (cvList.length === 0) reasons.push("Upload a CV before applying.");

  const urgency = getDeadlineUrgency(job.deadline);

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8">
      <div className="border-b border-rule bg-surface px-5 pt-1.5 pb-4.5">
        <Link
          href={`/companies/${job.company?.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-slate"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {job.company?.name}
        </Link>

        <div className="flex items-start gap-3.5">
          <CompanyLogo
            name={job.company?.name}
            logoUrl={job.company?.logo_url}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[24px] leading-[1.2] font-semibold text-ink">
              {job.title}
            </h1>
            <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
              {[job.company?.name, job.location].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {job.deadline && (
          <div
            className={`mt-3.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
              urgency === "urgent" ? "bg-[#FDEAE0]" : "bg-paper"
            }`}
          >
            {urgency === "urgent" && (
              <span className="h-[7px] w-[7px] rounded-full bg-flame" />
            )}
            <span
              className={`text-[12.5px] font-semibold tabular-nums ${
                urgency === "urgent" ? "text-closing" : "text-slate"
              }`}
            >
              {formatCountdown(job.deadline)} ·{" "}
              {formatDateTimeIST(job.deadline)} IST
            </span>
          </div>
        )}
      </div>

      {job.min_experience_years != null && (
        <div className="flex gap-2.5 px-5">
          <div className="flex-1 rounded-[10px] border border-rule bg-surface p-3">
            <p className="text-[11px] text-slate">Min. experience</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">
              {job.min_experience_years} yrs
            </p>
          </div>
          <div className="flex-1 rounded-[10px] border border-rule bg-surface p-3">
            <p className="text-[11px] text-slate">You have</p>
            <p
              className={`mt-0.5 text-[15px] font-semibold tabular-nums ${
                experienceShortfall ? "text-closing" : "text-live"
              }`}
            >
              {experience} yrs
            </p>
          </div>
        </div>
      )}

      <div className="px-5">
        {job.description && (
          <p className="max-w-[68ch] text-[14px] leading-[1.6] text-ink">
            {job.description}
          </p>
        )}

        {job.jd_path && (
          <form action={viewJd.bind(null, job.id, job.jd_path)} className="mt-3.5">
            <button
              type="submit"
              formTarget="_blank"
              className="inline-flex h-10 items-center rounded-lg border border-navy px-4 font-body text-[14px] font-semibold text-navy"
            >
              View JD (PDF)
            </button>
          </form>
        )}
      </div>

      <div className="px-5">
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
          <ApplyDialog
            jobId={job.id}
            cvs={cvList.map((cv) => ({
              id: cv.id,
              label: cv.label,
              createdAt: cv.created_at,
            }))}
          />
        )}
      </div>
    </main>
  );
}
