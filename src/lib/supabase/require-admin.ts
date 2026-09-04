import { redirect } from "next/navigation";
import { createClient } from "./server";

// Mirrors the /admin/* check in proxy.ts. The proxy is an optimistic,
// cookie-only gate; every admin page and action re-checks against the
// database directly, since that's the actual trust boundary.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!student?.is_admin) redirect("/");

  return { supabase, user };
}
