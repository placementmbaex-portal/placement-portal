import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST, istDatetimeLocalToUtcIso, nowMs, utcIsoToIstDatetimeLocal } from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  WEEKDAY_LABELS,
  formatMonthLabel,
  getMonthGridCells,
  googleCalendarUrl,
  istDateKey,
  type CalendarEntry,
} from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar-data";

const pad = (n: number) => String(n).padStart(2, "0");
const UPCOMING_WINDOW_DAYS = 400;

function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// The one colour rule for this page (per DESIGN.md): a deadline gets the
// existing deadline treatment (flame rule, closing text); every other
// event type is plain ink. No per-type chip colours.
function EventCard({ entry }: { entry: CalendarEntry }) {
  const isDeadline = entry.type === "deadline";

  return (
    <div
      className={`rounded-[14px] border border-rule bg-surface p-4 ${
        isDeadline ? "border-l-[3px] border-l-flame" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`font-body text-[10.5px] font-semibold tracking-[0.1em] uppercase ${
            isDeadline ? "text-closing" : "text-slate"
          }`}
        >
          {EVENT_TYPE_LABELS[entry.type]}
        </p>
        <span
          className={`text-[12.5px] font-medium tabular-nums ${isDeadline ? "text-closing" : "text-slate"}`}
        >
          {formatDateTimeIST(entry.startsAt)}
        </span>
      </div>

      {isDeadline ? (
        <>
          <p className="mt-1.5 font-display text-[17px] leading-[1.35] font-semibold text-ink">
            {entry.title}
          </p>
          {entry.companyName && (
            <p className="mt-0.5 text-[12.5px] leading-[1.45] text-slate">{entry.companyName}</p>
          )}
          <Link
            href={`/jobs/${entry.jobId}`}
            className="mt-3 flex h-10 items-center justify-center rounded-lg bg-navy font-body text-[14px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Apply now
          </Link>
        </>
      ) : (
        <>
          <Link
            href={`/events/${entry.id}`}
            className="mt-1.5 block font-display text-[17px] leading-[1.35] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {entry.title}
          </Link>
          {entry.companyName && (
            <p className="mt-0.5 text-[12.5px] leading-[1.45] text-slate">{entry.companyName}</p>
          )}
          {entry.venue ? (
            <p className="mt-0.5 text-[12.5px] leading-[1.45] text-slate">{entry.venue}</p>
          ) : (
            entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block text-[12.5px] leading-[1.45] text-navy hover:underline"
              >
                Join link
              </a>
            )
          )}
          <div className="mt-3 flex gap-3.5 text-[12.5px] font-medium">
            <a href={googleCalendarUrl(entry)} target="_blank" rel="noreferrer" className="text-navy hover:underline">
              Add to Google Calendar
            </a>
            {entry.jobId && (
              <Link href={`/jobs/${entry.jobId}`} className="text-navy hover:underline">
                View role
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default async function EventsPage({
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

  const todayKey = utcIsoToIstDatetimeLocal(new Date(nowMs()).toISOString()).slice(0, 10);
  const [todayYear, todayMonth1] = todayKey.split("-").map(Number);

  let year = todayYear;
  let month0 = todayMonth1 - 1;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month0 = m - 1;
  }

  const monthLabel = formatMonthLabel(year, month0);
  const monthStartUtc = istDatetimeLocalToUtcIso(`${year}-${pad(month0 + 1)}-01T00:00`)!;
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;
  const nextYear = month0 === 11 ? year + 1 : year;
  const monthEndUtc = istDatetimeLocalToUtcIso(`${nextYear}-${pad(nextMonth0 + 1)}-01T00:00`)!;

  const prevMonth0 = month0 === 0 ? 11 : month0 - 1;
  const prevYear = month0 === 0 ? year - 1 : year;
  const prevMonthParam = `${prevYear}-${pad(prevMonth0 + 1)}`;
  const nextMonthParam = `${nextYear}-${pad(nextMonth0 + 1)}`;

  const now = nowMs();
  const nowIso = new Date(now).toISOString();
  const upcomingEndIso = new Date(now + UPCOMING_WINDOW_DAYS * 86_400_000).toISOString();

  // Two independent ranges: the grid always shows a full calendar month
  // (past days included, since that's what a month looks like), while the
  // agenda is "what's coming up" from right now, regardless of which month
  // the grid happens to be showing.
  const [gridEntries, upcomingEntries] = await Promise.all([
    getCalendarEntries(supabase, monthStartUtc, monthEndUtc),
    getCalendarEntries(supabase, nowIso, upcomingEndIso),
  ]);

  const gridByDate = new Map<string, CalendarEntry[]>();
  for (const entry of gridEntries) {
    const key = istDateKey(entry.startsAt);
    gridByDate.set(key, [...(gridByDate.get(key) ?? []), entry]);
  }
  const cells = getMonthGridCells(year, month0);

  const upcomingByDate = new Map<string, CalendarEntry[]>();
  const upcomingDateOrder: string[] = [];
  for (const entry of upcomingEntries) {
    const key = istDateKey(entry.startsAt);
    if (!upcomingByDate.has(key)) {
      upcomingByDate.set(key, []);
      upcomingDateOrder.push(key);
    }
    upcomingByDate.get(key)!.push(entry);
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {upcomingEntries.length} upcoming
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
            Events
          </h1>
        </div>
        {student?.is_admin && (
          <Link
            href="/admin/events/new"
            className="flex h-11 items-center text-[13.5px] text-navy hover:underline"
          >
            Add event
          </Link>
        )}
      </div>

      {/* Month grid — desktop only. */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[17px] font-semibold text-ink">{monthLabel}</p>
          <div className="flex shrink-0 gap-1.5">
            <Link
              href={`/events?month=${prevMonthParam}`}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              ←
            </Link>
            <Link
              href={`/events?month=${nextMonthParam}`}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              →
            </Link>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden border border-rule bg-rule text-[13.5px]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-paper py-2 text-center text-slate">
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            const dayEntries = gridByDate.get(cell.dateKey) ?? [];
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
                      className={`truncate ${entry.type === "deadline" ? "text-closing" : "text-ink"}`}
                    >
                      {entry.title}
                    </li>
                  ))}
                  {dayEntries.length > 3 && <li className="text-slate">+{dayEntries.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda, upcoming first — mobile only. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {upcomingDateOrder.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            Nothing coming up. Interviews, tests and deadlines appear here as they&apos;re scheduled.
          </p>
        ) : (
          upcomingDateOrder.map((day) => (
            <div key={day} className="contents">
              <p className="ml-1 font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
                {formatDayLabel(day)}
              </p>
              <div className="flex flex-col gap-2.5">
                {upcomingByDate.get(day)!.map((entry) => (
                  <EventCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
