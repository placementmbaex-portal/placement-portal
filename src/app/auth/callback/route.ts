import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath, POST_LOGIN_REDIRECT_COOKIE } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Read before building any response -- GoogleSignInButton set this right
  // before handing off to Google, so it survived the round trip regardless
  // of what Google or Supabase themselves appended to the URL along the way.
  const rawNext = (await cookies()).get(POST_LOGIN_REDIRECT_COOKIE)?.value;
  const next = rawNext ? decodeURIComponent(rawNext) : null;
  const destination = isSafeRedirectPath(next) ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}${destination}`);
      response.cookies.delete(POST_LOGIN_REDIRECT_COOKIE);
      return response;
    }

    console.error("auth/callback: exchangeCodeForSession failed", error);

    // GoTrue wraps the `handle_new_user` trigger's rejection (email not on
    // the allowlist) in a generic "Database error saving new user" message.
    // Surface our own explanation instead of that generic one.
    const message = error.message.toLowerCase().includes("database error")
      ? "This email is not on the placement list. Contact a placement rep to get added."
      : error.message;

    const response = NextResponse.redirect(loginErrorUrl(origin, message, destination));
    response.cookies.delete(POST_LOGIN_REDIRECT_COOKIE);
    return response;
  }

  console.error("auth/callback: no ?code param on callback request", {
    url: request.url,
  });

  const response = NextResponse.redirect(
    loginErrorUrl(
      origin,
      "Sign-in was cancelled or the link had no authorization code.",
      destination,
    ),
  );
  response.cookies.delete(POST_LOGIN_REDIRECT_COOKIE);
  return response;
}

// Puts the intended destination back on the URL (not just in the cookie
// this route is about to delete) so if the student retries from /login,
// GoogleSignInButton re-sets the cookie and they still end up where they
// were originally headed instead of silently falling back to /.
function loginErrorUrl(origin: string, message: string, destination: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  if (destination !== "/") url.searchParams.set("next", destination);
  return url;
}
