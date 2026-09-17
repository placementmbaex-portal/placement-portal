import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed `middleware` to `proxy`; the runtime is always Node.js.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest must be publicly fetchable for "Add to Home
    // Screen" to work at all -- there's no user session to check it
    // against. api/ is excluded too: its one route (the deadline-reminder
    // cron) authenticates itself via CRON_SECRET, has no user cookies to
    // refresh, and was otherwise being redirected to /login before its
    // own check ever ran.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
