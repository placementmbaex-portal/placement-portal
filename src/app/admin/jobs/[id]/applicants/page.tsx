import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import {
  formatApplicationStatus,
  formatDateIST,
  formatDateTimeIST,
} from "@/lib/format";
import { viewApplicantCv } from "./actions";
import { BulkStatusForm, BULK_STATUS_FORM_ID } from "./bulk-status-form";
import { ShortlistUploadForm } from "./shortlist-upload-form";

type JobHeader = {
  id: string;
  title: string;
  deadline: string | null;
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
    .select("id, title, deadline, company:companies(name)")
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

  function sortHref(field: SortField) {
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    return `?sort=${field}&dir=${nextDir}`;
  }

  function sortIndicator(field: SortField) {
    if (sort !== field) return null;
    return dir === "asc" ? " ▲" : " ▼";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <Link
        href="/admin/jobs"
        className="text-[13.5px] text-slate hover:underline"
      >
        ← Jobs
      </Link>

      <div>
        <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          {job.title}
        </h1>
        <p className="text-[13.5px] leading-[1.45] text-slate">
          {job.company?.name}
        </p>
        <p className="mt-1 text-[13.5px] leading-[1.45] text-slate">
          {job.deadline
            ? `Deadline: ${formatDateTimeIST(job.deadline)} IST`
            : "No deadline"}{" "}
          · {applicantList.length} applicant
          {applicantList.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/admin/jobs/${job.id}/applicants/cvs`}
          className="flex h-10 items-center rounded-md border border-navy px-4 text-[15px] font-medium text-navy hover:bg-surface"
        >
          Download CVs (ZIP)
        </a>
        <a
          href={`/admin/jobs/${job.id}/applicants/export`}
          className="flex h-10 items-center rounded-md border border-navy px-4 text-[15px] font-medium text-navy hover:bg-surface"
        >
          Export Excel
        </a>
      </div>

      {applicantList.length === 0 ? (
        <p className="text-[15px] leading-[1.55] text-slate">
          No applicants yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-rule text-slate">
                <tr>
                  <th className="h-10 w-8 font-normal" />
                  <th className="h-10 font-normal">S. No.</th>
                  <th className="h-10 font-normal">
                    <Link href={sortHref("name")} className="hover:underline">
                      Name{sortIndicator("name")}
                    </Link>
                  </th>
                  <th className="h-10 font-normal">Roll No.</th>
                  <th className="h-10 font-normal">Experience</th>
                  <th className="h-10 font-normal">CV</th>
                  <th className="h-10 font-normal" />
                  <th className="h-10 font-normal">
                    <Link
                      href={sortHref("applied")}
                      className="hover:underline"
                    >
                      Applied{sortIndicator("applied")}
                    </Link>
                  </th>
                  <th className="h-10 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {applicantList.map((application, index) => (
                  <tr key={application.id} className="border-b border-rule">
                    <td className="h-10">
                      <input
                        type="checkbox"
                        name="application_ids"
                        value={application.id}
                        form={BULK_STATUS_FORM_ID}
                        aria-label={`Select ${application.student?.name ?? "applicant"}`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="h-10 text-slate">{index + 1}</td>
                    <td className="h-10 font-medium text-ink">
                      {application.student?.name}
                    </td>
                    <td className="h-10 text-slate">
                      {application.student?.roll_no ?? "—"}
                    </td>
                    <td className="h-10 text-slate">
                      {application.student?.total_experience_years != null
                        ? `${application.student.total_experience_years} yrs`
                        : "—"}
                    </td>
                    <td className="h-10 text-slate">
                      {application.cv?.label ?? "—"}
                    </td>
                    <td className="h-10">
                      {application.cv?.file_path && (
                        <form
                          action={viewApplicantCv.bind(
                            null,
                            job.id,
                            application.cv.file_path,
                          )}
                        >
                          <button
                            type="submit"
                            formTarget="_blank"
                            className="text-navy hover:underline"
                          >
                            View CV
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="h-10 whitespace-nowrap text-slate">
                      {formatDateTimeIST(application.applied_at)}
                    </td>
                    <td className="h-10 whitespace-nowrap text-ink">
                      {formatApplicationStatus(application.status)}
                      <span className="text-slate">
                        {" "}
                        · {formatDateIST(application.status_changed_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <BulkStatusForm jobId={job.id} />
          <ShortlistUploadForm jobId={job.id} />
        </>
      )}
    </main>
  );
}
