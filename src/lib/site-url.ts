// Emails need an absolute URL -- a relative link does nothing in an inbox.
// NEXT_PUBLIC_SITE_URL is set in .env.local / Vercel; VERCEL_URL is Vercel's
// own auto-injected preview/production host, used only if that's missing.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://placement-portal-theta-rosy.vercel.app");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
