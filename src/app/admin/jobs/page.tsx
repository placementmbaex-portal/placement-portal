import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST, getDeadlineUrgency } from "@/lib/format";
import { JobRowMenu } from "./job-row-menu";

type JobRow = {
  id: string;
  title: string;
  deadline: string | null;
  is_open: boolean;
  company: { id: string; name: string } | null;
};

const URGENCY_COLOR: Record<string, string> = {
  live: "#0F7B54",
  urgent: "#FB5813",
  shut: "#8B94A3",
};

type Filter = "all" | "open" | "closing" | "closed";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { filter: filterParam, q } = await searchParams;
  const filter: Filter = ["open", "closing", "closed"].includes(filterParam ?? "")
    ? (filterParam as Filter)
    : "all";
  const query = (q ?? "").trim().toLowerCase();

  const [
    { data: jobs },
    { data: applications },
    { data: events },
    { data: announcements },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, deadline, is_open, company:companies(id, name)")
      .order("created_at", { ascending: false })
      .overrideTypes<JobRow[], { merge: false }>(),
    supabase.from("applications").select("job_id, status"),
    supabase.from("events").select("job_id").not("job_id", "is", null),
    supabase.from("announcements").select("job_id").not("job_id", "is", null),
  ]);

  const applicantCounts = new Map<string, number>();
  const offerCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicantCounts.set(application.job_id, (applicantCounts.get(application.job_id) ?? 0) + 1);
    if (application.status === "offer") {
      offerCounts.set(application.job_id, (offerCounts.get(application.job_id) ?? 0) + 1);
    }
  }
  const eventCounts = new Map<string, number>();
  for (const event of events ?? []) {
    if (event.job_id) eventCounts.set(event.job_id, (eventCounts.get(event.job_id) ?? 0) + 1);
  }
  const announcementCounts = new Map<string, number>();
  for (const announcement of announcements ?? []) {
    if (announcement.job_id)
      announcementCounts.set(announcement.job_id, (announcementCounts.get(announcement.job_id) ?? 0) + 1);
  }

  const allJobs = jobs ?? [];
  const openCount = allJobs.filter((j) => j.is_open).length;
  const closingCount = allJobs.filter(
    (j) => j.is_open && getDeadlineUrgency(j.deadline) === "urgent",
  ).length;
  const closedCount = allJobs.filter((j) => !j.is_open).length;

  const filtered = allJobs.filter((job) => {
    if (filter === "open" && !job.is_open) return false;
    if (filter === "closing" && !(job.is_open && getDeadlineUrgency(job.deadline) === "urgent"))
      return false;
    if (filter === "closed" && job.is_open) return false;
    if (query) {
      const haystack = `${job.company?.name ?? ""} ${job.title}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: allJobs.length },
    { key: "open", label: "Open", count: openCount },
    { key: "closing", label: "Closing soon", count: closingCount },
    { key: "closed", label: "Closed", count: closedCount },
  ];

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {allJobs.length} roles · {openCount} open
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Jobs
          </h1>
        </div>
        <Link
          href="/admin/jobs/new"
          className="flex h-10 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white"
        >
          Create a role
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/jobs" : `/admin/jobs?filter=${f.key}`}
              className={`flex h-[34px] items-center rounded-lg px-3.5 font-body text-[12.5px] ${
                active
                  ? "bg-ink font-semibold text-white"
                  : "border border-rule bg-surface font-medium text-ink"
              }`}
            >
              {f.label} {f.count}
            </Link>
          );
        })}
        <span className="flex-1" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search company or title…"
          className="h-[34px] w-[220px] rounded-lg border border-rule px-3 text-[12.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      </form>

      {filtered.length === 0 ? (
        <p className="text-[14px] text-slate">No roles match.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-rule bg-paper text-slate">
              <tr>
                <th className="h-10 px-4 font-medium">Company</th>
                <th className="h-10 px-4 font-medium">Role</th>
                <th className="h-10 px-4 font-medium">Deadline</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 text-right font-medium">Applicants</th>
                <th className="h-10 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const urgency = getDeadlineUrgency(job.is_open ? job.deadline : null);
                const barColor = job.is_open ? URGENCY_COLOR[urgency] : URGENCY_COLOR.shut;
                return (
                  <tr key={job.id} className="h-12 border-b border-rule last:border-0">
                    <td className="px-4 whitespace-nowrap text-ink">
                      <span className="inline-flex items-center gap-2.5">
                        <span
                          className="h-[26px] w-2 rounded-[2px]"
                          style={{ backgroundColor: barColor }}
                        />
                        {job.company?.name}
                      </span>
                    </td>
                    <td className="px-4 font-display text-[14px] font-semibold text-ink">
                      {job.title}
                    </td>
                    <td
                      className="px-4 whitespace-nowrap tabular-nums"
                      style={{ color: urgency === "urgent" && job.is_open ? "#B03604" : "#5A6675" }}
                    >
                      {job.deadline ? formatDateTimeIST(job.deadline) : "—"}
                    </td>
                    <td className="px-4">
                      <span
                        className="inline-flex items-center gap-1.5 font-body text-[12.5px] font-medium"
                        style={{ color: job.is_open ? "#0F7B54" : "#5A6675" }}
                      >
                        <span
                          className="h-1.75 w-1.75 rounded-full"
                          style={{ backgroundColor: job.is_open ? "#0F7B54" : "#8B94A3" }}
                        />
                        {job.is_open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className="px-4 text-right tabular-nums">
                      <Link href={`/admin/jobs/${job.id}/applicants`} className="text-navy">
                        {applicantCounts.get(job.id) ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <Link href={`/admin/jobs/${job.id}/applicants`} className="text-navy">
                        Applicants
                      </Link>
                      <span className="mx-2 text-rule">|</span>
                      <Link href={`/admin/jobs/${job.id}/edit`} className="text-navy">
                        Edit
                      </Link>
                      <span className="mx-2 text-rule">|</span>
                      <JobRowMenu
                        jobId={job.id}
                        jobTitle={job.title}
                        companyName={job.company?.name ?? ""}
                        isOpen={job.is_open}
                        impact={{
                          applications: applicantCounts.get(job.id) ?? 0,
                          offers: offerCounts.get(job.id) ?? 0,
                          events: eventCounts.get(job.id) ?? 0,
                          announcements: announcementCounts.get(job.id) ?? 0,
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-shut">
        The 8px bar in the company column is the deadline state, same vocabulary as the student job row.
      </p>
    </main>
  );
}
