import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { toggleJobOpen } from "./actions";
import { OpenToggleButton } from "./open-toggle-button";

type JobRow = {
  id: string;
  title: string;
  deadline: string | null;
  is_open: boolean;
  company: { name: string } | null;
};

export default async function AdminJobsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, deadline, is_open, company:companies(name)")
      .order("created_at", { ascending: false })
      .overrideTypes<JobRow[], { merge: false }>(),
    supabase.from("applications").select("job_id"),
  ]);

  const applicantCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicantCounts.set(
      application.job_id,
      (applicantCounts.get(application.job_id) ?? 0) + 1,
    );
  }

  const jobList = jobs ?? [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Jobs
        </h1>
        <Link
          href="/admin/jobs/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create job
        </Link>
      </div>

      {jobList.length === 0 ? (
        <p className="text-sm text-zinc-500">No jobs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Applicants</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {jobList.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                    {job.company?.name}
                  </td>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {job.title}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                    {job.deadline ? formatDateTimeIST(job.deadline) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <form
                      action={toggleJobOpen.bind(null, job.id, !job.is_open)}
                    >
                      <OpenToggleButton isOpen={job.is_open} />
                    </form>
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    <Link
                      href={`/admin/jobs/${job.id}/applicants`}
                      className="hover:underline"
                    >
                      {applicantCounts.get(job.id) ?? 0}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/jobs/${job.id}/applicants`}
                      className="text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      Applicants
                    </Link>{" "}
                    ·{" "}
                    <Link
                      href={`/admin/jobs/${job.id}/edit`}
                      className="text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      Edit
                    </Link>
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
