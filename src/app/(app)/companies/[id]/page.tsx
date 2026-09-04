import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { JobCard } from "@/components/job-card";

export default async function CompanyPage({
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

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, sector, about, tags, is_legacy_recruiter, logo_url")
    .eq("id", id)
    .single();

  if (!company) notFound();

  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, location, deadline")
      .eq("company_id", id)
      .eq("is_open", true)
      .order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("applications").select("job_id").eq("student_id", user.id),
  ]);

  const appliedJobIds = new Set(
    (applications ?? []).map((application) => application.job_id),
  );
  const jobList = jobs ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-start gap-4">
        <CompanyLogo name={company.name} logoUrl={company.logo_url} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {company.name}
            </h1>
            {company.is_legacy_recruiter && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Legacy recruiter
              </span>
            )}
          </div>
          {company.sector && (
            <p className="text-sm text-zinc-500">{company.sector}</p>
          )}
        </div>
      </div>

      {company.about && (
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {company.about}
        </p>
      )}

      {company.tags && company.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {company.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Open roles</h2>
        {jobList.length === 0 ? (
          <p className="text-sm text-zinc-500">No open roles right now.</p>
        ) : (
          <ul className="space-y-3">
            {jobList.map((job) => (
              <li key={job.id}>
                <JobCard
                  job={job}
                  applied={appliedJobIds.has(job.id)}
                  hideCompany
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
