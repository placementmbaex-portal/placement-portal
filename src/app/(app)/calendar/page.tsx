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
  addDaysToDateKey,
  eventTypeChipCategory,
  formatMonthLabel,
  getMonthGridCells,
  getWeekDates,
  googleCalendarUrl,
  istDateKey,
  type CalendarEntry,
} from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar-data";
import { Chip } from "@/components/chip";
import { CATEGORY_CHIPS } from "@/lib/chips";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
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

  const { week: weekParam } = await searchParams;

  const todayKey = utcIsoToIstDatetimeLocal(new Date().toISOString()).slice(
    0,
    10,
  );
  const anchorKey =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : todayKey;

  const weekDates = getWeekDates(anchorKey);
  const sundayKey = weekDates[0].dateKey;

  const [sy, sm] = sundayKey.split("-").map(Number);
  const year = sy;
  const month0 = sm - 1;
  const monthLabel = formatMonthLabel(year, month0);

  const monthStartUtc = istDatetimeLocalToUtcIso(
    `${year}-${pad(month0 + 1)}-01T00:00`,
  )!;
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;
  const nextYear = month0 === 11 ? year + 1 : year;
  const monthEndUtc = istDatetimeLocalToUtcIso(
    `${nextYear}-${pad(nextMonth0 + 1)}-01T00:00`,
  )!;

  const entries = await getCalendarEntries(
    supabase,
    monthStartUtc,
    monthEndUtc,
  );

  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const key = istDateKey(entry.startsAt);
    entriesByDate.set(key, [...(entriesByDate.get(key) ?? []), entry]);
  }

  const cells = getMonthGridCells(year, month0);
  const prevWeekHref = `/calendar?week=${addDaysToDateKey(anchorKey, -7)}`;
  const nextWeekHref = `/calendar?week=${addDaysToDateKey(anchorKey, 7)}`;

  const weekEntryDates = weekDates.filter(
    (d) => (entriesByDate.get(d.dateKey) ?? []).length > 0,
  );

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {monthLabel}
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
            Calendar
          </h1>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={prevWeekHref}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-navy"
          >
            ←
          </Link>
          <Link
            href={nextWeekHref}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-navy"
          >
            →
          </Link>
        </div>
        {student?.is_admin && (
          <Link
            href="/admin/events/new"
            className="text-[13.5px] text-navy hover:underline"
          >
            Add event
          </Link>
        )}
      </div>

      {/* Week strip — phone. The desktop month grid below is an addition
          the README explicitly marks optional; kept since it's already
          built and free once the shared entries/cells exist. */}
      <div
        className="flex gap-1.5 overflow-x-auto md:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {weekDates.map((day) => {
          const dayEntries = entriesByDate.get(day.dateKey) ?? [];
          const hasDeadline = dayEntries.some((e) => e.type === "deadline");
          const hasEvent = dayEntries.some((e) => e.type !== "deadline");
          const isToday = day.dateKey === todayKey;

          return (
            <div
              key={day.dateKey}
              className={`w-[46px] shrink-0 rounded-[10px] border py-2 text-center ${
                isToday
                  ? "border-ink bg-ink"
                  : hasDeadline
                    ? "border-[rgba(251,88,19,0.35)] bg-[#FDEAE0]"
                    : "border-rule bg-surface"
              }`}
            >
              <p
                className={`font-body text-[9.5px] font-semibold tracking-[0.06em] uppercase ${
                  isToday
                    ? "text-white/65"
                    : hasDeadline
                      ? "text-closing"
                      : "text-slate"
                }`}
              >
                {WEEKDAY_LABELS[day.weekdayIndex]}
              </p>
              <p
                className={`mt-0.5 font-body text-[17px] font-semibold tabular-nums ${
                  isToday ? "text-white" : hasDeadline ? "text-closing" : "text-ink"
                }`}
              >
                {day.day}
              </p>
              <span
                className="mx-auto mt-1 block h-[5px] w-[5px] rounded-full"
                style={{
                  background: isToday
                    ? "#fff"
                    : hasDeadline
                      ? "#FB5813"
                      : hasEvent
                        ? "#014488"
                        : "transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Month grid — desktop only. */}
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

      {/* Agenda — every viewport, grouped by day within the selected week. */}
      <div className="flex flex-col gap-2.5 rounded-2xl bg-scroll p-4">
        {weekEntryDates.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            Nothing on the calendar this week.
          </p>
        ) : (
          weekEntryDates.map((day) => {
            const dayEntries = entriesByDate.get(day.dateKey) ?? [];
            const dayHasDeadline = dayEntries.some(
              (e) => e.type === "deadline",
            );
            return (
              <div key={day.dateKey} className="contents">
                <p
                  className={`ml-1 font-body text-[10.5px] font-semibold tracking-[0.1em] uppercase ${dayHasDeadline ? "text-closing" : "text-slate"}`}
                >
                  {formatDayLabel(day.dateKey)}
                </p>
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-[14px] border border-rule bg-surface p-4 ${
                      entry.type === "deadline"
                        ? "border-l-[3px] border-l-flame"
                        : "border-l-[3px] border-l-navy"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <Chip
                        style={{
                          ...CATEGORY_CHIPS[eventTypeChipCategory(entry.type)],
                          label: EVENT_TYPE_LABELS[entry.type],
                        }}
                      />
                      <span
                        className={`text-[12.5px] font-medium tabular-nums ${entry.type === "deadline" ? "text-closing" : "text-slate"}`}
                      >
                        {formatDateTimeIST(entry.startsAt).split(", ")[1]}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-[17px] leading-[1.35] font-semibold text-ink">
                      {entry.title}
                    </p>
                    {entry.venue && (
                      <p className="mt-0.5 text-[12.5px] leading-[1.45] text-slate">
                        {entry.venue}
                      </p>
                    )}

                    {entry.type === "deadline" ? (
                      <Link
                        href={`/jobs/${entry.jobId}`}
                        className="mt-3 flex h-10 items-center justify-center rounded-lg bg-navy font-body text-[14px] font-semibold text-white"
                      >
                        Apply now
                      </Link>
                    ) : (
                      <div className="mt-3 flex gap-3.5 text-[12.5px] font-medium">
                        <a
                          href={googleCalendarUrl(entry)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-navy hover:underline"
                        >
                          Add to Google Calendar
                        </a>
                        {entry.jobId && (
                          <Link
                            href={`/jobs/${entry.jobId}`}
                            className="text-navy hover:underline"
                          >
                            View role
                          </Link>
                        )}
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
