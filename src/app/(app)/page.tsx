import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST } from "@/lib/format";
import { JobCard } from "@/components/job-card";

type OpenJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  company: { id: string; name: string } | null;
};

type ApplicationRow = {
  id: string;
  applied_at: string;
  job: { id: string; title: string; company: { name: string } | null } | null;
  cv: { label: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: openJobs }, { data: applications }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, location, deadline, company:companies(id, name)")
      .eq("is_open", true)
      .order("deadline", { ascending: true, nullsFirst: false })
      .overrideTypes<OpenJob[], { merge: false }>(),
    supabase
      .from("applications")
      .select(
        "id, applied_at, job:jobs(id, title, company:companies(name)), cv:cvs(label)",
      )
      .eq("student_id", user.id)
      .order("applied_at", { ascending: false })
      .overrideTypes<ApplicationRow[], { merge: false }>(),
  ]);

  const jobList = openJobs ?? [];
  const applicationList = applications ?? [];
  const appliedJobIds = new Set(
    applicationList.map((application) => application.job?.id).filter(Boolean),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Open roles
        </h1>
        {jobList.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No open roles right now. Check back soon.
          </p>
        ) : (
          <ul className="space-y-3">
            {jobList.map((job) => (
              <li key={job.id}>
                <JobCard
                  job={job}
                  companyName={job.company?.name}
                  applied={appliedJobIds.has(job.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My applications
        </h2>
        {applicationList.length === 0 ? (
          <p className="text-sm text-zinc-500">
            You haven&apos;t applied to anything yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {applicationList.map((application) => (
              <li
                key={application.id}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <Link
                  href={`/jobs/${application.job?.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {application.job?.title}
                </Link>
                <p className="text-xs text-zinc-500">
                  {application.job?.company?.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  CV: {application.cv?.label} · Applied{" "}
                  {formatDateIST(application.applied_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
