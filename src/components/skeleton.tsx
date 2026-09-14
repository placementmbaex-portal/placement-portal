// No default background: callers always pass one (bg-rule on light
// surfaces, bg-white/20 on the dark profile header band, etc.) since a
// hardcoded default here would sit in the same class string as a caller's
// override with no guaranteed precedence between the two.
export function Skeleton({ className = "" }: { className: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} />;
}

// Matches job-card.tsx's real DOM shape (badge + title + subtitle + countdown
// line) so the swap from skeleton to real card doesn't reflow.
export function JobCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-md bg-rule" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 bg-rule" />
          <Skeleton className="h-3 w-1/2 bg-rule" />
        </div>
      </div>
      <Skeleton className="mt-3 h-3 w-2/5 bg-rule" />
    </div>
  );
}

// Matches the calendar agenda / "This week" row shape (day block + title +
// time line) used on both the dashboard and the calendar page.
export function AgendaRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-9 w-11 shrink-0 rounded-md bg-rule" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/2 bg-rule" />
        <Skeleton className="h-3 w-1/3 bg-rule" />
      </div>
    </div>
  );
}

// Matches announcement-card.tsx's shape (title + two-line body + footer).
export function AnnouncementCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <Skeleton className="h-4 w-2/3 bg-rule" />
      <div className="mt-2.5 space-y-1.5">
        <Skeleton className="h-3 w-full bg-rule" />
        <Skeleton className="h-3 w-4/5 bg-rule" />
      </div>
      <Skeleton className="mt-3 h-3 w-1/3 bg-rule" />
    </div>
  );
}
