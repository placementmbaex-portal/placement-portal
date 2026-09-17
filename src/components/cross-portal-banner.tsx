import Link from "next/link";

// The one thing DESIGN (1).md is explicit nobody may be left guessing
// about: which side of the portal they're on. An admin viewing the
// student side (via "Switch to student view" in the user menu, or just
// browsing their own applications) gets this instead of silently looking
// identical to a real student's screen.
export function CrossPortalBanner() {
  return (
    <div className="flex h-9 w-full items-center justify-center gap-2 bg-brown px-4 text-center font-body text-[12.5px] font-medium whitespace-nowrap text-white">
      <span>You&apos;re viewing the student portal</span>
      <Link
        href="/admin"
        className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Back to admin
      </Link>
    </div>
  );
}
