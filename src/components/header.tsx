import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: student } = await supabase
    .from("students")
    .select("name")
    .eq("id", user.id)
    .single();

  const initials = (student?.name ?? "?")
    .trim()
    .split(/\s+/)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rule bg-surface px-5 py-2.5">
      <Image
        src="/logo-iimc.svg"
        alt="IIM Calcutta"
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />
      <span className="h-[22px] w-px bg-rule" />
      <span className="font-body text-[17px] font-bold tracking-[-0.01em] text-navy">
        MBA<span className="text-flame">Ex</span>
      </span>
      <span className="flex-1" />
      <Link
        href="/profile"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-navy font-body text-[12.5px] font-semibold text-white"
      >
        {initials}
      </Link>
    </header>
  );
}
