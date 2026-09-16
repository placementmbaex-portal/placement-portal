import type { ApplicationStatus } from "@/lib/format";

export type StatusTagKind = ApplicationStatus | "not_applied" | "not_eligible";

const STATUS_LABELS: Record<StatusTagKind, string> = {
  not_applied: "Not applied",
  not_eligible: "Not eligible",
  applied: "Applied",
  shortlisted: "Shortlisted",
  in_process: "In process",
  offer: "Offer",
  not_selected: "Not selected",
};

type DotStyle = "none" | "ring" | "filled";

// Ring dots (Applied/Shortlisted/In process) read as "still moving";
// filled dots (Offer/Not selected) read as "decided" -- the one
// distinction DESIGN.md's own wording draws out ("live FILLED dot" for
// Offer). Not applied/Not eligible get no dot at all: the label text
// itself, in slate/shut, is the entire signal.
const STATUS_DOT: Record<StatusTagKind, { style: DotStyle; color?: string }> = {
  not_applied: { style: "none" },
  not_eligible: { style: "none" },
  applied: { style: "ring", color: "border-navy" },
  shortlisted: { style: "ring", color: "border-live" },
  in_process: { style: "ring", color: "border-flame" },
  offer: { style: "filled", color: "bg-live" },
  not_selected: { style: "filled", color: "bg-shut" },
};

const STATUS_TEXT: Record<StatusTagKind, string> = {
  not_applied: "text-slate",
  not_eligible: "text-shut",
  applied: "text-ink",
  shortlisted: "text-ink",
  in_process: "text-ink",
  offer: "text-ink",
  not_selected: "text-ink opacity-60",
};

// The five real values come straight from applications.status. The other
// two are derived, never stored -- a job the student has never applied to
// has no application row to read a status from in the first place.
export function deriveJobStatusTag(params: {
  applicationStatus?: string | null;
  minExperienceYears?: number | null;
  studentExperienceYears?: number | null;
}): StatusTagKind {
  const { applicationStatus, minExperienceYears, studentExperienceYears } = params;
  if (applicationStatus) return applicationStatus as StatusTagKind;
  if (minExperienceYears != null && (studentExperienceYears ?? 0) < minExperienceYears) {
    return "not_eligible";
  }
  return "not_applied";
}

// Dot plus label, never a filled pill -- deadline state already owns the
// 3px left rule, so status uses a different shape (a dot) rather than a
// second colour competing for the same visual role. Only tokens already
// in the palette are used; no new colour is introduced here.
export function StatusTag({
  status,
  className = "",
}: {
  status: StatusTagKind;
  className?: string;
}) {
  const dot = STATUS_DOT[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap ${STATUS_TEXT[status]} ${className}`}
    >
      {dot.style !== "none" && (
        <span
          className={`h-2 w-2 shrink-0 rounded-full border ${
            dot.style === "filled" ? `border-transparent ${dot.color}` : `bg-transparent ${dot.color}`
          }`}
        />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
