// Carries the pre-login destination through the OAuth round trip (Google,
// then Supabase's own redirect) as a cookie rather than a redirectTo query
// param -- redirectTo has to exactly match an allowed URL in Supabase's
// auth settings, so it isn't a safe place to smuggle an arbitrary path. A
// plain SameSite=Lax cookie survives the trip fine: Lax cookies are sent
// on top-level GET navigations, which is exactly how the browser lands
// back on /auth/callback. Set by GoogleSignInButton, read and cleared by
// auth/callback/route.ts.
export const POST_LOGIN_REDIRECT_COOKIE = "post_login_redirect";

// Guards every "return to where you were" redirect (post-login, and
// signed-in-hits-/login) against being pointed off-site -- the value
// always originates from something the app itself put in a URL or
// cookie, but never trust it as more than user-controlled input: a
// single leading slash rules out both an absolute URL (http://evil.com)
// and a protocol-relative one (//evil.com, which browsers resolve to the
// current protocol + evil.com host).
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}
