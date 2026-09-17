import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST, getDeadlineUrgency } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_WHATSAPP_TEMPLATES, fillWhatsAppTemplate } from "@/lib/whatsapp";
import { WhatsAppShareModal } from "@/components/whatsapp-share-modal";
import { NotSharedMarker } from "@/components/not-shared-marker";
import { JobRowMenu } from "./job-row-menu";
import { markJobWhatsAppShared } from "./actions";

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  is_open: boolean;
  whatsapp_shared_at: string | null;
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

  const [{ data: jobs }, { data: applications }, { data: whatsappSetting }, { count: totalStudents }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, location, deadline, is_open, whatsapp_shared_at, company:companies(id, name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .overrideTypes<JobRow[], { merge: false }>(),
      supabase.from("applications").select("job_id, status"),
      supabase.from("app_settings").select("value").eq("key", "whatsapp_template_job").single(),
      supabase.from("allowed_students").select("email", { count: "exact", head: true }),
    ]);

  const whatsappTemplate = (whatsappSetting?.value as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.job;

  const applicantCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicantCounts.set(application.job_id, (applicantCounts.get(application.job_id) ?? 0) + 1);
  }

  const allJobs = jobs ?? [];

  type JobImpact = { applications: number; events: number };
  const impactByJob = new Map<string, JobImpact>();
  await Promise.all(
    allJobs.map(async (job) => {
      const { data } = await supabase.rpc("deletion_impact", {
        p_kind: "job",
        p_id: job.id,
      });
      impactByJob.set(job.id, {
        applications: data?.applications ?? 0,
        events: data?.events ?? 0,
      });
    }),
  );
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
          className="flex h-11 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
              className={`flex h-11 items-center rounded-lg px-3.5 font-body text-[12.5px] sm:h-[34px] ${
                active
                  ? "bg-ink font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  : "border border-rule bg-surface font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
          aria-label="Search company or title"
          className="h-11 w-full rounded-lg border border-rule px-3 text-[12.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink sm:h-[34px] sm:w-[220px]"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      </form>

      {filtered.length === 0 ? (
        <p className="text-[14px] text-slate">No roles match.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
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
                  const notShared = job.is_open && !job.whatsapp_shared_at;
                  const whatsappMessage = fillWhatsAppTemplate(whatsappTemplate, {
                    company: job.company?.name,
                    title: job.title,
                    location: job.location,
                    deadlineIso: job.deadline,
                    link: absoluteUrl(`/jobs/${job.id}`),
                    appliedCount: applicantCounts.get(job.id) ?? 0,
                    totalStudents: totalStudents ?? 0,
                  });
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
                        <span className="inline-flex items-center gap-2">
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
                          {notShared && <NotSharedMarker />}
                        </span>
                      </td>
                      <td className="px-4 text-right tabular-nums">
                        <Link
                          href={`/admin/jobs/${job.id}/applicants`}
                          className="text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {applicantCounts.get(job.id) ?? 0}
                        </Link>
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/jobs/${job.id}/applicants`}
                          className="text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          Applicants
                        </Link>
                        <span className="mx-2 text-rule">|</span>
                        <Link
                          href={`/admin/jobs/${job.id}/edit`}
                          className="text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          Edit
                        </Link>
                        <span className="mx-2 text-rule">|</span>
                        <WhatsAppShareModal
                          title={`Share ${job.title}`}
                          message={whatsappMessage}
                          onShare={markJobWhatsAppShared.bind(null, job.id)}
                          triggerClassName="text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        />
                        <span className="mx-2 text-rule">|</span>
                        <JobRowMenu
                          jobId={job.id}
                          jobTitle={job.title}
                          companyName={job.company?.name ?? ""}
                          isOpen={job.is_open}
                          impact={impactByJob.get(job.id) ?? { applications: 0, events: 0 }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            {filtered.map((job) => {
              const urgency = getDeadlineUrgency(job.is_open ? job.deadline : null);
              const barColor = job.is_open ? URGENCY_COLOR[urgency] : URGENCY_COLOR.shut;
              const applicantCount = applicantCounts.get(job.id) ?? 0;
              const notShared = job.is_open && !job.whatsapp_shared_at;
              const whatsappMessage = fillWhatsAppTemplate(whatsappTemplate, {
                company: job.company?.name,
                title: job.title,
                location: job.location,
                deadlineIso: job.deadline,
                link: absoluteUrl(`/jobs/${job.id}`),
                appliedCount: applicantCount,
                totalStudents: totalStudents ?? 0,
              });
              return (
                <div
                  key={job.id}
                  className="flex gap-3 rounded-[14px] border border-rule bg-surface p-4"
                >
                  <span
                    className="w-1 shrink-0 self-stretch rounded-full"
                    style={{ backgroundColor: barColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-slate">{job.company?.name}</p>
                    <p className="truncate font-display text-[15px] font-semibold text-ink">
                      {job.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                      <span
                        className="inline-flex items-center gap-1.5 font-medium"
                        style={{ color: job.is_open ? "#0F7B54" : "#5A6675" }}
                      >
                        <span
                          className="h-1.75 w-1.75 rounded-full"
                          style={{ backgroundColor: job.is_open ? "#0F7B54" : "#8B94A3" }}
                        />
                        {job.is_open ? "Open" : "Closed"}
                      </span>
                      {notShared && <NotSharedMarker />}
                      <span className="text-rule">·</span>
                      <span
                        className="tabular-nums"
                        style={{
                          color: urgency === "urgent" && job.is_open ? "#B03604" : "#5A6675",
                        }}
                      >
                        {job.deadline ? formatDateTimeIST(job.deadline) : "No deadline"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={`/admin/jobs/${job.id}/applicants`}
                        className="flex h-11 items-center font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {applicantCount} applicant{applicantCount === 1 ? "" : "s"}
                      </Link>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/jobs/${job.id}/edit`}
                          className="flex h-11 items-center px-2 font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          Edit
                        </Link>
                        <WhatsAppShareModal
                          title={`Share ${job.title}`}
                          message={whatsappMessage}
                          onShare={markJobWhatsAppShared.bind(null, job.id)}
                          triggerLabel="Share"
                          triggerClassName="flex h-11 items-center px-2 font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        />
                        <JobRowMenu
                          jobId={job.id}
                          jobTitle={job.title}
                          companyName={job.company?.name ?? ""}
                          isOpen={job.is_open}
                          impact={impactByJob.get(job.id) ?? { applications: 0, events: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <p className="hidden text-[12px] text-shut sm:block">
        The 8px bar in the company column is the deadline state, same vocabulary as the student job row.
      </p>
    </main>
  );
}
