import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeadlineUrgency } from "@/lib/format";
import { JobCard } from "@/components/job-card";

type OpenJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  min_experience_years: number | null;
  company: { id: string; name: string } | null;
};

type Filter = "all" | "not_applied" | "eligible";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { filter: filterParam } = await searchParams;
  const filter: Filter =
    filterParam === "not_applied" || filterParam === "eligible"
      ? filterParam
      : "all";

  const [{ data: student }, { data: jobs }, { data: applications }] =
    await Promise.all([
      supabase
        .from("students")
        .select("total_experience_years")
        .eq("id", user.id)
        .single(),
      supabase
        .from("jobs")
        .select(
          "id, title, location, deadline, min_experience_years, company:companies(id, name)",
        )
        .eq("is_open", true)
        .order("deadline", { ascending: true, nullsFirst: false })
        .overrideTypes<OpenJob[], { merge: false }>(),
      supabase.from("applications").select("job_id").eq("student_id", user.id),
    ]);

  const appliedJobIds = new Set(
    (applications ?? []).map((application) => application.job_id),
  );
  const experience = student?.total_experience_years ?? 0;

  const allJobs = jobs ?? [];
  const closingCount = allJobs.filter(
    (job) => getDeadlineUrgency(job.deadline) === "urgent",
  ).length;

  const filteredJobs = allJobs.filter((job) => {
    if (filter === "not_applied") return !appliedJobIds.has(job.id);
    if (filter === "eligible") {
      return (
        job.min_experience_years == null || experience >= job.min_experience_years
      );
    }
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "not_applied", label: "Not applied" },
    { key: "eligible", label: "Eligible" },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
              {allJobs.length} open · {closingCount} closing
            </p>
            <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
              Open roles
            </h1>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/jobs" : `/jobs?filter=${f.key}`}
              className={`flex h-[34px] items-center rounded-full px-3.5 font-body text-[13px] ${
                filter === f.key
                  ? "bg-navy font-semibold text-white"
                  : "border border-rule bg-surface font-medium text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        {filteredJobs.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            No roles match this filter.
          </p>
        ) : (
          filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              companyName={job.company?.name}
              applied={appliedJobIds.has(job.id)}
              showApplyButton
            />
          ))
        )}
      </div>
    </main>
  );
}
