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
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-4 py-8">
      <section>
        <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Open roles
        </h1>
        {jobList.length === 0 ? (
          <p className="mt-4 text-[15px] leading-[1.55] text-slate">
            No open roles right now. New postings will appear here.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {jobList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                companyName={job.company?.name}
                applied={appliedJobIds.has(job.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Your applications
        </h2>
        {applicationList.length === 0 ? (
          <p className="mt-4 text-[15px] leading-[1.55] text-slate">
            You haven&apos;t applied to anything yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {applicationList.map((application) => (
              <Link
                key={application.id}
                href={`/jobs/${application.job?.id}`}
                className="block py-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
                  {application.job?.title}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
                  {application.job?.company?.name}
                </p>
                <p className="mt-1 text-[13.5px] leading-[1.4] text-slate">
                  CV: {application.cv?.label} · Applied{" "}
                  {formatDateIST(application.applied_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
