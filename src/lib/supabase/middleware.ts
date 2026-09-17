import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and getUser().
  // A stray return here can randomly drop refreshed sessions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    // The full path the student was actually trying to reach -- captured
    // before this URL gets rewritten to /login -- so GoogleSignInButton
    // can carry it through the OAuth round trip (see its own comment) and
    // land them back on, say, /jobs/<id> instead of the dashboard.
    const intended = pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (intended !== "/") url.searchParams.set("next", intended);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const destination = isSafeRedirectPath(next) ? next : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: student } = await supabase
      .from("students")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!student?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
