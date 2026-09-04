import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }

    // GoTrue wraps the `handle_new_user` trigger's rejection (email not on
    // the allowlist) in a generic "Database error saving new user" message.
    // Surface our own explanation instead of that generic one.
    const message = error.message.toLowerCase().includes("database error")
      ? "This email is not on the placement list. Contact a placement rep to get added."
      : error.message;

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Something went wrong signing you in. Please try again.")}`,
  );
}
