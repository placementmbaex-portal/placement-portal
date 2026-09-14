import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/admin-tabs";

// Security lives at the page level (requireAdmin() on every admin page,
// per the existing convention) and at the proxy. This layout only renders
// chrome, so it stays defensive rather than redirecting on its own.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initials = "?";
  let pendingCount = 0;

  if (user) {
    const { data: student } = await supabase
      .from("students")
      .select("name")
      .eq("id", user.id)
      .single();
    if (student?.name) {
      initials = student.name
        .trim()
        .split(/\s+/)
        .map((part: string) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }

    const { count } = await supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="min-h-dvh bg-paper">
      <div className="bg-brown px-4 sm:px-6">
        <div className="flex h-[58px] items-center gap-2.5 sm:gap-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper">
            <Image
              src="/logo-iimc.svg"
              alt="IIM Calcutta"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
            />
          </span>
          <span className="hidden h-[22px] w-px bg-white/28 sm:block" />
          <span className="font-body text-[16px] font-bold whitespace-nowrap text-white">
            MBA<span className="text-flame">Ex</span>
          </span>
          <span className="hidden text-[13.5px] whitespace-nowrap text-white/70 sm:inline">
            Placements admin
          </span>
          <span className="flex-1" />
          <Link
            href="/admin/announcements"
            className="flex h-11 shrink-0 items-center rounded-lg bg-white/14 px-2.5 font-body text-[12.5px] font-medium whitespace-nowrap text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-8 sm:px-3"
          >
            <span className="sm:hidden">{pendingCount} pending</span>
            <span className="hidden sm:inline">
              {pendingCount} pending approval{pendingCount === 1 ? "" : "s"}
            </span>
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/18 font-body text-[12px] font-semibold text-white sm:h-8 sm:w-8">
            {initials}
          </span>
        </div>
        <AdminTabs pendingCount={pendingCount} />
      </div>
      <div className="px-4 pt-6.5 pb-7.5 sm:px-6">{children}</div>
    </div>
  );
}
