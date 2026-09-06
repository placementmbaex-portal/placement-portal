import { requireAdmin } from "@/lib/supabase/require-admin";

const ATTENTION_WINDOW_HOURS = 48;

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const attentionWindowEnd = new Date(
    now.getTime() + ATTENTION_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const [
    { count: registeredCount },
    { count: signedInCount },
    { data: cvOwners },
    { data: applicantIds },
    { count: companyCount },
    { count: roleCount },
    { count: applicationCount },
    { count: offerCount },
    { count: pendingAnnouncementCount },
    { count: closingSoonCount },
    { data: openJobs },
  ] = await Promise.all([
    supabase.from("allowed_students").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("cvs").select("student_id"),
    supabase.from("applications").select("student_id"),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "offer"),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_open", true)
      .gt("deadline", now.toISOString())
      .lt("deadline", attentionWindowEnd.toISOString()),
    supabase
      .from("jobs")
      .select("id, title, company:companies(name), applications(status)")
      .eq("is_open", true)
      .overrideTypes<
        {
          id: string;
          title: string;
          company: { name: string } | null;
          applications: { status: string }[];
        }[],
        { merge: false }
      >(),
  ]);

  const cvUploaderCount = new Set((cvOwners ?? []).map((r) => r.student_id)).size;
  const applicantCount = new Set((applicantIds ?? []).map((r) => r.student_id)).size;

  const jobs = openJobs ?? [];
  const shortlistPendingCount = jobs.filter((job) => {
    const total = job.applications.length;
    const advanced = job.applications.filter((a) =>
      ["shortlisted", "in_process", "offer"].includes(a.status),
    ).length;
    return total > 0 && advanced === 0;
  }).length;

  const perRole = jobs
    .map((job) => ({
      label: [job.company?.name, job.title].filter(Boolean).join(" · "),
      count: job.applications.length,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxPerRole = Math.max(1, ...perRole.map((r) => r.count));

  const registered = registeredCount ?? 0;
  const signedIn = signedInCount ?? 0;

  const attention = [
    { label: "Announcements pending approval", value: pendingAnnouncementCount ?? 0 },
    { label: `Roles closing in ${ATTENTION_WINDOW_HOURS} hours`, value: closingSoonCount ?? 0 },
    { label: "Shortlists not yet uploaded", value: shortlistPendingCount },
  ];

  const soFar = [
    { label: "Companies on board", value: companyCount ?? 0, tone: "text-ink" },
    { label: "Roles posted", value: roleCount ?? 0, tone: "text-ink" },
    { label: "Applications submitted", value: applicationCount ?? 0, tone: "text-ink" },
    { label: "Offers recorded", value: offerCount ?? 0, tone: "text-live" },
  ];

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Overview
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border border-rule bg-surface p-5.5 shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
          <p className="font-body text-[11px] font-semibold tracking-[0.09em] text-slate uppercase">
            Cohort adoption
          </p>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="font-body text-[44px] leading-none font-semibold tabular-nums text-ink">
              {signedIn}
            </span>
            <span className="text-[15px] text-slate">
              of {registered} students signed in at least once
            </span>
          </div>

          <div className="mt-5 h-px bg-rule" />

          <div className="mt-5 grid grid-cols-3 gap-4.5">
            <div>
              <p className="text-[12px] text-slate">Signed in at least once</p>
              <p className="mt-0.5 font-body text-[21px] font-semibold tabular-nums text-ink">
                {signedIn} <span className="text-[13px] font-normal text-slate">/ {registered}</span>
              </p>
            </div>
            <div>
              <p className="text-[12px] text-slate">Uploaded &ge;1 CV</p>
              <p className="mt-0.5 font-body text-[21px] font-semibold tabular-nums text-ink">
                {cvUploaderCount} <span className="text-[13px] font-normal text-slate">/ {registered}</span>
              </p>
            </div>
            <div>
              <p className="text-[12px] text-slate">Applied to &ge;1 role</p>
              <p className="mt-0.5 font-body text-[21px] font-semibold tabular-nums text-ink">
                {applicantCount} <span className="text-[13px] font-normal text-slate">/ {registered}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-[1.5] text-shut">
            &ldquo;Active this week&rdquo; and dormant-student tracking need a last-seen
            timestamp not yet collected.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[rgba(251,88,19,0.28)] bg-[#FDEAE0] p-4.5">
            <p className="font-body text-[11px] font-semibold tracking-[0.09em] text-closing uppercase">
              Needs your attention
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {attention.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-ink">{row.label}</span>
                  <span className="font-body text-[15px] font-semibold tabular-nums text-closing">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-rule bg-surface p-4.5">
            <p className="font-body text-[11px] font-semibold tracking-[0.09em] text-slate uppercase">
              Slot 1 so far
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {soFar.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-ink">{row.label}</span>
                  <span
                    className={`font-body text-[15px] font-semibold tabular-nums ${row.tone}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-semibold text-ink">
            Applications per role
          </h2>
          <span className="text-[12px] text-shut">open roles only</span>
        </div>
        <div className="mt-3.5 rounded-xl border border-rule bg-surface p-4.5">
          {perRole.length === 0 ? (
            <p className="py-2 text-[13.5px] text-slate">
              No applications on open roles yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {perRole.map((row) => (
                <div key={row.label} className="flex items-center gap-3.5">
                  <span className="w-[170px] shrink-0 truncate text-[13px] text-ink">
                    {row.label}
                  </span>
                  <span className="h-5 flex-1 overflow-hidden rounded-[3px] bg-[#ECEFF3]">
                    <span
                      className="block h-full bg-navy"
                      style={{ width: `${(row.count / maxPerRole) * 100}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-body text-[13px] font-medium tabular-nums text-ink">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
