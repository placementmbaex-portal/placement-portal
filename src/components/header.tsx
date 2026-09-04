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

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
      <Link
        href="/"
        className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        IIM Calcutta MBAEx Placement Portal
      </Link>
      <nav className="flex shrink-0 items-center gap-4 text-sm">
        <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">
          {student?.name}
        </span>
        <Link
          href="/profile"
          className="text-zinc-700 hover:underline dark:text-zinc-300"
        >
          Profile
        </Link>
        {student?.is_admin && (
          <Link
            href="/admin"
            className="text-zinc-700 hover:underline dark:text-zinc-300"
          >
            Admin
          </Link>
        )}
        <SignOutButton />
      </nav>
    </header>
  );
}
