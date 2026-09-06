import Link from "next/link";
import {
  formatCountdown,
  formatDateTimeIST,
  getDeadlineUrgency,
  type DeadlineUrgency,
} from "@/lib/format";

type JobCardJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  min_experience_years?: number | null;
};

const RULE_COLOR: Record<DeadlineUrgency, string> = {
  live: "border-live",
  urgent: "border-flame",
  shut: "border-shut",
};

// The role row: DESIGN.md's one workhorse component. A 3px left rule carries
// the only colour in the row, and it always means deadline state — never
// anything else. The whole row is a click target (via the stretched title
// link); showApplyButton additionally renders a real, independently
// clickable Apply button (2d, the full roles list) rather than nesting a
// second <a> inside the row's own link.
export function JobCard({
  job,
  companyName,
  applied,
  hideCompany = false,
  showApplyButton = false,
}: {
  job: JobCardJob;
  companyName?: string | null;
  applied: boolean;
  hideCompany?: boolean;
  showApplyButton?: boolean;
}) {
  const urgency = getDeadlineUrgency(job.deadline);
  const closed = urgency === "shut";
  const href = `/jobs/${job.id}`;

  const primary = hideCompany ? job.title : companyName;
  const secondaryParts = hideCompany
    ? [job.location]
    : [
        job.title,
        job.location,
        job.min_experience_years
          ? `${job.min_experience_years}+ yrs`
          : null,
      ];
  const secondary = secondaryParts.filter(Boolean).join(" · ");

  return (
    <div
      className={`relative rounded-[14px] border border-rule bg-surface p-4 shadow-[0_1px_3px_rgba(22,32,46,0.08)] ${RULE_COLOR[urgency]} border-l-[3px] ${closed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper font-body text-[13px] font-semibold text-slate">
          {(companyName ?? job.title ?? "?").trim().slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] leading-[1.35] font-semibold text-ink">
            <Link href={href} className="static after:absolute after:inset-0">
              {primary}
            </Link>
          </p>
          {secondary && (
            <p className="mt-0.5 truncate text-[12.5px] leading-[1.45] text-slate">
              {secondary}
            </p>
          )}
        </div>
        {applied && (
          <span className="shrink-0 text-[12.5px] font-medium whitespace-nowrap text-live">
            Applied ✓
          </span>
        )}
      </div>

      <p
        className={`mt-2.5 text-[13px] leading-[1.4] font-medium tabular-nums ${
          urgency === "urgent" ? "text-closing" : "text-slate"
        }`}
      >
        {job.deadline
          ? `${formatCountdown(job.deadline)} · ${formatDateTimeIST(job.deadline)} IST`
          : "No deadline"}
      </p>

      {showApplyButton && !applied && !closed && (
        <Link
          href={href}
          className={`relative z-10 mt-3 flex h-[42px] items-center justify-center rounded-lg font-body text-[14.5px] font-semibold ${
            urgency === "urgent"
              ? "bg-navy text-white"
              : "border border-navy text-navy"
          }`}
        >
          Apply
        </Link>
      )}
    </div>
  );
}
