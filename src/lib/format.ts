export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "in_process"
  | "offer"
  | "not_selected";

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  in_process: "In process",
  offer: "Offer",
  not_selected: "Not selected",
};

export function formatApplicationStatus(status: string): string {
  return (
    APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status
  );
}

export function formatDateIST(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Manually assembled from parts rather than relying on a locale's own
// punctuation, so the shape stays exactly "Wed 12 Mar, 6:00 PM".
export function formatDateTimeIST(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}

const IST_OFFSET_MINUTES = 5 * 60 + 30;

// `<input type="datetime-local">` gives back a timezone-less
// "YYYY-MM-DDTHH:mm" string. The admin form treats that value as IST wall
// clock time regardless of the admin's own browser timezone, so we convert
// by hand rather than trust `Date` to guess a timezone.
export function istDatetimeLocalToUtcIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) -
    IST_OFFSET_MINUTES * 60_000;

  return new Date(utcMs).toISOString();
}

// The inverse, for pre-filling a datetime-local input from a stored UTC
// timestamp. Uses the UTC accessors on a shifted timestamp so the result
// doesn't depend on the server process's own timezone.
export function utcIsoToIstDatetimeLocal(iso: string): string {
  const istMs = new Date(iso).getTime() + IST_OFFSET_MINUTES * 60_000;
  const d = new Date(istMs);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// Sentence case: DESIGN.md's own example reads "Closes in 31 hours", as a
// standalone leading phrase rather than a clause appended after other text.
export function formatCountdown(deadlineIso: string) {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return "Deadline passed";

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return `Closes in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `Closes in ${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes >= 1)
    return `Closes in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "Closes soon";
}

export type DeadlineUrgency = "live" | "urgent" | "shut";

// DESIGN.md's job-row state thresholds: >48h is live, <48h is urgent (the
// rule turns --flame and the countdown text --closing), past or closed is
// shut (the row drops to 60% opacity). A job with no deadline is treated as
// live — there's no time signal to raise.
export function getDeadlineUrgency(
  deadlineIso: string | null,
): DeadlineUrgency {
  if (!deadlineIso) return "live";

  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return "shut";

  const hours = diffMs / 3_600_000;
  return hours <= 48 ? "urgent" : "live";
}
