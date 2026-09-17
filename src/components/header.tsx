import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { CrossPortalBanner } from "@/components/cross-portal-banner";

const RECENT_NOTIFICATIONS_LIMIT = 15;

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: student }, { data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase.from("students").select("name, email, is_admin").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_NOTIFICATIONS_LIMIT)
      .overrideTypes<NotificationItem[], { merge: false }>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  return (
    <>
      {student?.is_admin && <CrossPortalBanner />}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-rule bg-surface px-5">
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
          href="/applications"
          className="text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Applications
        </Link>
        <NotificationBell notifications={notifications ?? []} unreadCount={unreadCount ?? 0} />
        <UserMenu
          name={student?.name ?? "?"}
          email={student?.email ?? ""}
          isAdmin={student?.is_admin ?? false}
          onAdminSide={false}
        />
      </header>
    </>
  );
}
