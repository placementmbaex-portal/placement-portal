// The quiet gap-marker the committee needs: an open role or an approved
// announcement that has never been shared to WhatsApp. Deliberately
// understated -- a small outline dot, not a red badge -- since this is a
// nudge, not an error.
export function NotSharedMarker() {
  return (
    <span
      title="Not yet shared on WhatsApp"
      aria-label="Not yet shared on WhatsApp"
      className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-shut align-middle"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-shut" />
    </span>
  );
}
