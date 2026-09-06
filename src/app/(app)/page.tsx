import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCountdown,
  formatDateTimeIST,
  getDeadlineUrgency,
  istDatetimeLocalToUtcIso,
  utcIsoToIstDatetimeLocal,
} from "@/lib/format";
import { JobCard } from "@/components/job-card";
import { AnnouncementCard, type AnnouncementData } from "@/components/announcement-card";
import { getCalendarEntries } from "@/lib/calendar-data";
import type { AnnouncementCategory } from "@/lib/chips";

const OPEN_ROLES_PREVIEW = 2;
const THIS_WEEK_PREVIEW = 3;

type OpenJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  min_experience_years: number | null;
  company: { id: string; name: string } | null;
};

type PinnedAnnouncement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  is_pinned: boolean;
  attachment_path: string | null;
  published_at: string;
  comments_locked: boolean;
  author_id: string;
  company: { id: string; name: string } | null;
  job: { id: string; title: string } | null;
};

function greetingWord(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIstLocal = utcIsoToIstDatetimeLocal(new Date().toISOString());
  const istHour = Number(nowIstLocal.slice(11, 13));
  const weekStartUtc = istDatetimeLocalToUtcIso(
    `${nowIstLocal.slice(0, 10)}T00:00`,
  )!;
  const weekEndUtc = new Date(
    new Date(weekStartUtc).getTime() + 7 * 86_400_000,
  ).toISOString();

  const [
    { data: student },
    { data: openJobs },
    { data: applications },
    { data: pinnedAnnouncements },
    weekEntries,
  ] = await Promise.all([
    supabase.from("students").select("name").eq("id", user.id).single(),
    supabase
      .from("jobs")
      .select(
        "id, title, location, deadline, min_experience_years, company:companies(id, name)",
      )
      .eq("is_open", true)
      .order("deadline", { ascending: true, nullsFirst: false })
      .overrideTypes<OpenJob[], { merge: false }>(),
    supabase
      .from("applications")
      .select("job_id")
      .eq("student_id", user.id),
    supabase
      .from("announcements")
      .select(
        "id, title, body, category, is_pinned, attachment_path, published_at, comments_locked, author_id, company:companies(id, name), job:jobs(id, title)",
      )
      .eq("status", "approved")
      .eq("is_pinned", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .overrideTypes<PinnedAnnouncement[], { merge: false }>(),
    getCalendarEntries(supabase, weekStartUtc, weekEndUtc),
  ]);

  const firstName = (student?.name ?? "there").trim().split(/\s+/)[0];
  const jobList = openJobs ?? [];
  const appliedJobIds = new Set(
    (applications ?? []).map((a) => a.job_id).filter(Boolean),
  );

  const soonestNotApplied = jobList.find((job) => !appliedJobIds.has(job.id));
  const showUrgentBand =
    soonestNotApplied &&
    getDeadlineUrgency(soonestNotApplied.deadline) === "urgent";

  const pinned = pinnedAnnouncements?.[0];
  let pinnedAuthorName: string | undefined;
  if (pinned) {
    const { data: author } = await supabase
      .from("student_names")
      .select("name")
      .eq("id", pinned.author_id)
      .single();
    pinnedAuthorName = author?.name;
  }
  const pinnedCard: AnnouncementData | null = pinned
    ? {
        id: pinned.id,
        title: pinned.title,
        body: pinned.body,
        category: pinned.category,
        isPinned: true,
        attachmentPath: pinned.attachment_path,
        publishedAt: pinned.published_at,
        commentsLocked: pinned.comments_locked,
        authorName: pinnedAuthorName ?? "Unknown",
        company: pinned.company,
        job: pinned.job,
      }
    : null;

  return (
    <main className="flex flex-1 flex-col gap-6 bg-scroll pb-6">
      <div className="bg-surface px-5 pt-5">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Placements · MBAEx {new Date().getFullYear()}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
          Good {greetingWord(istHour)}, {firstName}
        </h1>
      </div>

      {showUrgentBand && soonestNotApplied && (
        <div className="mx-4 -mt-2 rounded-[14px] border border-[rgba(251,88,19,0.28)] bg-[#FDEAE0] p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-flame" />
            <span className="font-body text-[10.5px] font-semibold tracking-[0.09em] text-closing uppercase">
              Closing soon
            </span>
          </div>
          <p className="mt-2 font-display text-[19px] leading-[1.3] font-semibold text-ink">
            {soonestNotApplied.company?.name}
          </p>
          <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
            {[soonestNotApplied.title, soonestNotApplied.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.4] font-medium tabular-nums text-closing">
            {formatCountdown(soonestNotApplied.deadline!)} ·{" "}
            {formatDateTimeIST(soonestNotApplied.deadline!)} IST
          </p>
          <Link
            href={`/jobs/${soonestNotApplied.id}`}
            className="mt-3.5 flex h-11 items-center justify-center rounded-lg bg-navy font-body text-[15px] font-semibold text-white"
          >
            Apply now
          </Link>
        </div>
      )}

      {pinnedCard && (
        <section className="px-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">
              Pinned
            </h2>
            <Link href="/announcements" className="text-[13px] text-navy">
              All announcements
            </Link>
          </div>
          <div className="mt-2.5">
            <AnnouncementCard
              announcement={pinnedCard}
              comments={[]}
              currentUserId={user.id}
              isAdmin={false}
            />
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">
            Open roles
          </h2>
          <Link href="/jobs" className="text-[13px] text-navy">
            See all {jobList.length}
          </Link>
        </div>
        {jobList.length === 0 ? (
          <p className="mt-2.5 text-[15px] leading-[1.55] text-slate">
            No open roles right now. New postings will appear here.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2">
            {jobList.slice(0, OPEN_ROLES_PREVIEW).map((job) => (
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

      <section className="px-4">
        <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">
          This week
        </h2>
        {weekEntries.length === 0 ? (
          <p className="mt-2.5 text-[15px] leading-[1.55] text-slate">
            Nothing on the calendar this week.
          </p>
        ) : (
          <div className="mt-2.5 divide-y divide-rule overflow-hidden rounded-[14px] border border-rule bg-surface">
            {weekEntries.slice(0, THIS_WEEK_PREVIEW).map((entry) => {
              const entryIstLocal = utcIsoToIstDatetimeLocal(entry.startsAt);
              const dayNum = Number(entryIstLocal.slice(8, 10));
              const weekdayLabel = new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                timeZone: "UTC",
              })
                .format(new Date(entryIstLocal.slice(0, 10) + "T12:00:00Z"))
                .toUpperCase();
              const isDeadline = entry.type === "deadline";

              return (
                <div key={entry.id} className="flex items-center gap-3 p-3">
                  <div className="w-11 shrink-0 text-center">
                    <p
                      className={`font-body text-[10px] font-semibold uppercase ${isDeadline ? "text-closing" : "text-slate"}`}
                    >
                      {weekdayLabel}
                    </p>
                    <p
                      className={`font-body text-[18px] font-semibold tabular-nums ${isDeadline ? "text-closing" : "text-ink"}`}
                    >
                      {dayNum}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {entry.title}
                    </p>
                    <p
                      className={`mt-px text-[12.5px] ${isDeadline ? "text-closing" : "text-slate"}`}
                    >
                      {formatDateTimeIST(entry.startsAt).split(", ")[1]}
                      {entry.venue ? ` · ${entry.venue}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
