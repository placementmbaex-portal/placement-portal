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
      <div className="bg-brown px-6">
        <div className="flex h-[58px] items-center gap-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper">
            <Image
              src="/logo-iimc.svg"
              alt="IIM Calcutta"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
            />
          </span>
          <span className="h-[22px] w-px bg-white/28" />
          <span className="font-body text-[16px] font-bold text-white">
            MBA<span className="text-flame">Ex</span>
          </span>
          <span className="text-[13.5px] text-white/70">
            Placements admin
          </span>
          <span className="flex-1" />
          <Link
            href="/admin/announcements"
            className="flex h-8 items-center rounded-lg bg-white/14 px-3 font-body text-[12.5px] font-medium text-white"
          >
            {pendingCount} pending approval{pendingCount === 1 ? "" : "s"}
          </Link>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/18 font-body text-[12px] font-semibold text-white">
            {initials}
          </span>
        </div>
        <AdminTabs pendingCount={pendingCount} />
      </div>
      <div className="px-6 pt-6.5 pb-7.5">{children}</div>
    </div>
  );
}
