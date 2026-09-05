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
};

const RULE_COLOR: Record<DeadlineUrgency, string> = {
  live: "border-live",
  urgent: "border-flame",
  shut: "border-shut",
};

// The job row: DESIGN.md's one workhorse component. A 3px left rule carries
// the only colour in the row, and it always means deadline state — never
// anything else. The whole row is the click target.
export function JobCard({
  job,
  companyName,
  applied,
  hideCompany = false,
}: {
  job: JobCardJob;
  companyName?: string | null;
  applied: boolean;
  hideCompany?: boolean;
}) {
  const urgency = getDeadlineUrgency(job.deadline);

  // Company name is normally the headline; when the company is already
  // established by the surrounding page (the company's own job list), the
  // job title takes that slot instead.
  const primary = hideCompany ? job.title : companyName;
  const secondary = (hideCompany ? [job.location] : [job.title, job.location])
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`flex items-start gap-4 border-l-[3px] py-4 pr-1 pl-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${RULE_COLOR[urgency]} ${urgency === "shut" ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[17px] leading-[1.35] font-semibold text-ink">
          {primary}
        </p>
        {secondary && (
          <p className="mt-0.5 truncate text-[13.5px] leading-[1.45] text-slate">
            {secondary}
          </p>
        )}
        <p
          className={`mt-1 text-[13.5px] leading-[1.4] font-medium tabular-nums ${
            urgency === "urgent" ? "text-closing" : "text-slate"
          }`}
        >
          {job.deadline
            ? `${formatCountdown(job.deadline)} · ${formatDateTimeIST(job.deadline)} IST`
            : "No deadline"}
        </p>
      </div>
      {applied && (
        <span className="shrink-0 text-[13.5px] font-medium text-ink">
          Applied ✓
        </span>
      )}
    </Link>
  );
}
