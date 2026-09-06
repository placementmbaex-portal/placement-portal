import { utcIsoToIstDatetimeLocal } from "@/lib/format";

export type EventType = "ppt" | "test" | "interview" | "other" | "deadline";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  ppt: "PPT",
  test: "Written test",
  interview: "Interview day",
  other: "Other",
  deadline: "Deadline",
};

export type CalendarEntry = {
  id: string;
  type: EventType;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  link: string | null;
  companyName: string | null;
  jobId: string | null;
};

// IST date key (YYYY-MM-DD) for bucketing an entry into a calendar day as
// experienced in IST, not the raw UTC date the timestamp happens to fall on.
export function istDateKey(iso: string): string {
  return utcIsoToIstDatetimeLocal(iso).slice(0, 10);
}

export function googleCalendarUrl(entry: {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  description?: string | null;
}): string {
  const format = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${format(entry.startsAt)}/${format(entry.endsAt)}`,
  });
  if (entry.location) params.set("location", entry.location);
  if (entry.description) params.set("details", entry.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export type MonthCell = {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

// A 7-column grid of IST calendar dates covering the given month, padded
// with the leading/trailing days needed to fill whole weeks.
export function getMonthGridCells(year: number, month0: number): MonthCell[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateKeyFor = (y: number, m0: number, d: number) => {
    // Roll y/m0/d through Date.UTC so month underflow/overflow (e.g. day 0
    // of March = last day of February) resolves correctly, then format --
    // never fed back into Date parsing, so no timezone round-trip risk.
    const rolled = new Date(Date.UTC(y, m0, d));
    return `${rolled.getUTCFullYear()}-${pad(rolled.getUTCMonth() + 1)}-${pad(rolled.getUTCDate())}`;
  };

  const firstWeekday = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

  const cells: MonthCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({
      dateKey: dateKeyFor(year, month0, -i),
      day: new Date(Date.UTC(year, month0, -i)).getUTCDate(),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ dateKey: dateKeyFor(year, month0, day), day, isCurrentMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - firstWeekday - daysInMonth + 1;
    cells.push({
      dateKey: dateKeyFor(year, month0 + 1, nextDay),
      day: new Date(Date.UTC(year, month0 + 1, nextDay)).getUTCDate(),
      isCurrentMonth: false,
    });
  }

  return cells;
}

export function formatMonthLabel(year: number, month0: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month0, 1)));
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The agenda's chip reuses the announcement category palette (there's no
// separate colour vocabulary for calendar entries): ppt and deadline map
// directly, everything else (test/interview/other) falls back to the
// neutral "general" chip.
export function eventTypeChipCategory(
  type: EventType,
): "ppt" | "deadline" | "general" {
  if (type === "ppt" || type === "deadline") return type;
  return "general";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function dateKeyToUtcNoonMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

function utcNoonMsToDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return utcNoonMsToDateKey(dateKeyToUtcNoonMs(dateKey) + days * 86_400_000);
}

export type WeekDay = { dateKey: string; day: number; weekdayIndex: number };

// Sunday-to-Saturday week containing anchorKey (a YYYY-MM-DD date, not an
// instant — using UTC noon throughout sidesteps any timezone rounding).
export function getWeekDates(anchorKey: string): WeekDay[] {
  const anchorMs = dateKeyToUtcNoonMs(anchorKey);
  const anchorWeekday = new Date(anchorMs).getUTCDay();
  const sundayMs = anchorMs - anchorWeekday * 86_400_000;

  return Array.from({ length: 7 }, (_, i) => {
    const ms = sundayMs + i * 86_400_000;
    return {
      dateKey: utcNoonMsToDateKey(ms),
      day: new Date(ms).getUTCDate(),
      weekdayIndex: i,
    };
  });
}
