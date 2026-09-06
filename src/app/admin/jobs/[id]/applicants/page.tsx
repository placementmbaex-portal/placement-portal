import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { ApplicantsTable } from "./applicants-table";
import { ShortlistUploadForm } from "./shortlist-upload-form";

type JobHeader = {
  id: string;
  title: string;
  deadline: string | null;
  location: string | null;
  company: { name: string } | null;
};

type ApplicantRow = {
  id: string;
  applied_at: string;
  status: string;
  status_changed_at: string;
  cv: { label: string; file_path: string } | null;
  student: {
    name: string;
    roll_no: string | null;
    total_experience_years: number | null;
  } | null;
};

type SortField = "name" | "applied";

export default async function JobApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id: jobId } = await params;
  const { sort: sortParam, dir: dirParam } = await searchParams;

  const sort: SortField = sortParam === "applied" ? "applied" : "name";
  const dir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, deadline, location, company:companies(name)")
    .eq("id", jobId)
    .single()
    .overrideTypes<JobHeader, { merge: false }>();

  if (!job) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, applied_at, status, status_changed_at, cv:cvs(label, file_path), student:students(name, roll_no, total_experience_years)",
    )
    .eq("job_id", jobId)
    .overrideTypes<ApplicantRow[], { merge: false }>();

  const applicantList = [...(applications ?? [])].sort((a, b) => {
    const cmp =
      sort === "name"
        ? (a.student?.name ?? "").localeCompare(b.student?.name ?? "")
        : new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
    return dir === "desc" ? -cmp : cmp;
  });

  return (
    <main className="flex flex-col gap-5">
      <Link href="/admin/jobs" className="font-body text-[12.5px] font-medium text-navy">
        ← Jobs
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] leading-[1.2] font-semibold text-ink">
            {job.title}
          </h1>
          <p className="mt-1 text-[13.5px] text-slate">
            {[
              job.company?.name,
              job.location,
              job.deadline ? `closes ${formatDateTimeIST(job.deadline)} IST` : null,
              `${applicantList.length} applicant${applicantList.length === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2.5">
          <a
            href={`/admin/jobs/${job.id}/applicants/cvs`}
            className="flex h-10 items-center rounded-md border border-navy px-4 font-body text-[13.5px] font-semibold text-navy"
          >
            Download all CVs (.zip)
          </a>
          <a
            href={`/admin/jobs/${job.id}/applicants/export`}
            className="flex h-10 items-center rounded-md border border-navy px-4 font-body text-[13.5px] font-semibold text-navy"
          >
            Export as Excel
          </a>
        </div>
      </div>

      {applicantList.length === 0 ? (
        <p className="text-[14px] text-slate">No applicants yet.</p>
      ) : (
        <ApplicantsTable jobId={job.id} applicants={applicantList} sort={sort} dir={dir} />
      )}

      <ShortlistUploadForm jobId={job.id} />
    </main>
  );
}
