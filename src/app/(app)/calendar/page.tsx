import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTimeIST,
  getDeadlineUrgency,
  istDatetimeLocalToUtcIso,
  utcIsoToIstDatetimeLocal,
} from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  WEEKDAY_LABELS,
  formatMonthLabel,
  getMonthGridCells,
  googleCalendarUrl,
  istDateKey,
  type CalendarEntry,
  type EventType,
} from "@/lib/calendar";

type DeadlineJob = {
  id: string;
  title: string;
  deadline: string;
  company: { name: string } | null;
};

type EventRow = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  link: string | null;
  job_id: string | null;
  company: { name: string } | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { month: monthParam } = await searchParams;

  const nowIstLocal = utcIsoToIstDatetimeLocal(new Date().toISOString());
  let year = Number(nowIstLocal.slice(0, 4));
  let month0 = Number(nowIstLocal.slice(5, 7)) - 1;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    year = Number(monthParam.slice(0, 4));
    month0 = Number(monthParam.slice(5, 7)) - 1;
  }

  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;
  const nextYear = month0 === 11 ? year + 1 : year;
  const prevMonth0 = month0 === 0 ? 11 : month0 - 1;
  const prevYear = month0 === 0 ? year - 1 : year;

  const monthStartUtc = istDatetimeLocalToUtcIso(
    `${year}-${pad(month0 + 1)}-01T00:00`,
  )!;
  const monthEndUtc = istDatetimeLocalToUtcIso(
    `${nextYear}-${pad(nextMonth0 + 1)}-01T00:00`,
  )!;

  const [{ data: deadlineJobs }, { data: events }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, deadline, company:companies(name)")
      .not("deadline", "is", null)
      .gte("deadline", monthStartUtc)
      .lt("deadline", monthEndUtc)
      .overrideTypes<DeadlineJob[], { merge: false }>(),
    supabase
      .from("events")
      .select(
        "id, title, type, starts_at, ends_at, venue, link, job_id, company:companies(name)",
      )
      .gte("starts_at", monthStartUtc)
      .lt("starts_at", monthEndUtc)
      .overrideTypes<EventRow[], { merge: false }>(),
  ]);

  const deadlineEntries: CalendarEntry[] = (deadlineJobs ?? []).map((job) => ({
    id: `deadline-${job.id}`,
    type: "deadline",
    title: job.title,
    startsAt: job.deadline,
    endsAt: job.deadline,
    venue: null,
    link: null,
    companyName: job.company?.name ?? null,
    jobId: job.id,
  }));

  const eventEntries: CalendarEntry[] = (events ?? []).map((event) => ({
    id: event.id,
    type: event.type as EventType,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    venue: event.venue,
    link: event.link,
    companyName: event.company?.name ?? null,
    jobId: event.job_id,
  }));

  const entries = [...deadlineEntries, ...eventEntries].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const key = istDateKey(entry.startsAt);
    entriesByDate.set(key, [...(entriesByDate.get(key) ?? []), entry]);
  }

  const cells = getMonthGridCells(year, month0);
  const monthLabel = formatMonthLabel(year, month0);
  const prevHref = `/calendar?month=${prevYear}-${pad(prevMonth0 + 1)}`;
  const nextHref = `/calendar?month=${nextYear}-${pad(nextMonth0 + 1)}`;

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Calendar
        </h1>
        {student?.is_admin && (
          <Link
            href="/admin/events/new"
            className="text-[13.5px] text-navy hover:underline"
          >
            Add event
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link href={prevHref} className="text-[13.5px] text-navy hover:underline">
          ← Previous
        </Link>
        <p className="text-[15px] leading-[1.55] text-ink">{monthLabel}</p>
        <Link href={nextHref} className="text-[13.5px] text-navy hover:underline">
          Next →
        </Link>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-px overflow-hidden border border-rule bg-rule text-[13.5px]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-paper py-2 text-center text-slate">
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            const dayEntries = entriesByDate.get(cell.dateKey) ?? [];
            return (
              <div
                key={cell.dateKey}
                className={`min-h-[104px] bg-surface p-2 ${cell.isCurrentMonth ? "" : "opacity-40"}`}
              >
                <p className="tabular-nums text-ink">{cell.day}</p>
                <ul className="mt-1 space-y-0.5">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <li
                      key={entry.id}
                      className={`truncate ${
                        entry.type === "deadline" &&
                        getDeadlineUrgency(entry.startsAt) === "urgent"
                          ? "text-closing"
                          : "text-ink"
                      }`}
                    >
                      {entry.title}
                    </li>
                  ))}
                  {dayEntries.length > 3 && (
                    <li className="text-slate">
                      +{dayEntries.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        {entries.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            Nothing on the calendar this month.
          </p>
        ) : (
          <div className="divide-y divide-rule">
            {entries.map((entry) => (
              <div key={entry.id} className="py-4">
                <p className="text-[13.5px] leading-[1.45] text-slate">
                  {formatDateTimeIST(entry.startsAt)} IST
                </p>
                <p className="mt-0.5 font-display text-[17px] leading-[1.35] font-semibold text-ink">
                  {entry.title}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
                  {EVENT_TYPE_LABELS[entry.type]}
                  {entry.companyName ? ` · ${entry.companyName}` : ""}
                  {entry.venue ? ` · ${entry.venue}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-[13.5px]">
                  {entry.link && (
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-navy hover:underline"
                    >
                      Join link
                    </a>
                  )}
                  {entry.jobId && (
                    <Link
                      href={`/jobs/${entry.jobId}`}
                      className="text-navy hover:underline"
                    >
                      View role
                    </Link>
                  )}
                  <a
                    href={googleCalendarUrl(entry)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-navy hover:underline"
                  >
                    Add to Google Calendar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
