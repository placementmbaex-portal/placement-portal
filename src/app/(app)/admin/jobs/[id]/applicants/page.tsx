import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { viewApplicantCv } from "./actions";

type JobHeader = {
  id: string;
  title: string;
  deadline: string | null;
  company: { name: string } | null;
};

type ApplicantRow = {
  id: string;
  applied_at: string;
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
      "id, applied_at, cv:cvs(label, file_path), student:students(name, roll_no, total_experience_years)",
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <Link
        href="/admin/jobs"
        className="text-sm text-zinc-500 hover:underline"
      >
        ← Jobs
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {job.title}
        </h1>
        <p className="text-sm text-zinc-500">{job.company?.name}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {job.deadline
            ? `Deadline: ${formatDateTimeIST(job.deadline)}`
            : "No deadline"}{" "}
          · {applicantList.length} applicant
          {applicantList.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/admin/jobs/${job.id}/applicants/cvs`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Download CVs (ZIP)
        </a>
        <a
          href={`/admin/jobs/${job.id}/applicants/export`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Export Excel
        </a>
      </div>

      {applicantList.length === 0 ? (
        <p className="text-sm text-zinc-500">No applicants yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2 font-medium">S. No.</th>
                <th className="px-3 py-2 font-medium">
                  <Link href={sortHref("name")} className="hover:underline">
                    Name{sortIndicator("name")}
                  </Link>
                </th>
                <th className="px-3 py-2 font-medium">Roll No.</th>
                <th className="px-3 py-2 font-medium">Experience</th>
                <th className="px-3 py-2 font-medium">CV</th>
                <th className="px-3 py-2 font-medium" />
                <th className="px-3 py-2 font-medium">
                  <Link
                    href={sortHref("applied")}
                    className="hover:underline"
                  >
                    Applied{sortIndicator("applied")}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {applicantList.map((application, index) => (
                <tr
                  key={application.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-3 py-2 text-zinc-500">{index + 1}</td>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {application.student?.name}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {application.student?.roll_no ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {application.student?.total_experience_years != null
                      ? `${application.student.total_experience_years} yrs`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {application.cv?.label ?? "—"}
                  </td>
                  <td className="px-3 py-2">
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
                          className="text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          View CV
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                    {formatDateTimeIST(application.applied_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
