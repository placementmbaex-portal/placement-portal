import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST, formatCountdown, formatDateTimeIST } from "@/lib/format";
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
        .select("id, applied_at, cv:cvs(label)")
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <Link
        href={`/companies/${job.company?.id}`}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← {job.company?.name}
      </Link>

      <div className="flex items-start gap-4">
        <CompanyLogo name={job.company?.name} logoUrl={job.company?.logo_url} />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {job.title}
          </h1>
          {job.location && (
            <p className="text-sm text-zinc-500">{job.location}</p>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {job.deadline
          ? `Deadline: ${formatDateTimeIST(job.deadline)} · ${formatCountdown(job.deadline)}`
          : "No deadline"}
      </p>

      {job.description && (
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.description}
        </p>
      )}

      {job.jd_path && (
        <form action={viewJd.bind(null, job.id, job.jd_path)}>
          <button
            type="submit"
            formTarget="_blank"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            View JD
          </button>
        </form>
      )}

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        {application ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              You applied with{" "}
              <span className="font-medium">{application.cv?.label}</span> on{" "}
              {formatDateIST(application.applied_at)}.
            </p>
            {!deadlinePassed && (
              <form action={withdrawApplication.bind(null, application.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Withdraw this application? This cannot be undone."
                  pendingLabel="Withdrawing…"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Withdraw
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        ) : reasons.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-500">
              You can&apos;t apply to this job yet:
            </p>
            <ul className="list-inside list-disc text-sm text-zinc-500">
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
