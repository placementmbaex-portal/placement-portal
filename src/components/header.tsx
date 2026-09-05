import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: student } = await supabase
    .from("students")
    .select("name, is_admin")
    .eq("id", user.id)
    .single();

  let pendingCount = 0;
  if (student?.is_admin) {
    const { count } = await supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-rule bg-surface px-4 py-3">
      <Link
        href="/"
        className="truncate font-display text-[17px] font-semibold text-ink"
      >
        IIM Calcutta MBAEx Placement Portal
      </Link>
      <nav className="flex shrink-0 items-center gap-4 text-[13.5px]">
        <span className="hidden text-slate sm:inline">{student?.name}</span>
        <Link href="/profile" className="text-ink hover:underline">
          Profile
        </Link>
        {student?.is_admin && (
          <>
            <Link href="/admin" className="text-ink hover:underline">
              Admin
            </Link>
            <Link
              href="/admin/announcements"
              className="text-navy hover:underline"
            >
              Pending ({pendingCount})
            </Link>
          </>
        )}
        <SignOutButton />
      </nav>
    </header>
  );
}
