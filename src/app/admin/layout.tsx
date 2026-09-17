import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar, AdminBottomBar } from "@/components/admin-nav";
import { UserMenu } from "@/components/user-menu";

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

  let name = "?";
  let email = "";
  let pendingCount = 0;
  let emailMode: string | null = null;

  if (user) {
    const { data: student } = await supabase
      .from("students")
      .select("name, email")
      .eq("id", user.id)
      .single();
    if (student) {
      name = student.name;
      email = student.email;
    }

    const { count } = await supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;

    // Non-admins get nothing back here (RLS), which is fine -- this
    // banner only ever renders inside an already admin-gated page tree.
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_mode")
      .single();
    emailMode = (setting?.value as string | undefined) ?? null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper md:flex-row">
      <AdminSidebar pendingCount={pendingCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-rule bg-surface px-4 sm:px-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy md:hidden">
            <Image
              src="/logo-iimc.svg"
              alt="IIM Calcutta"
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
          </span>
          <span className="font-body text-[14px] font-bold whitespace-nowrap text-navy md:hidden">
            MBA<span className="text-flame">Ex</span>
          </span>
          <span className="flex-1" />
          <Link
            href="/admin/announcements"
            className="flex h-11 shrink-0 items-center rounded-lg border border-rule px-2.5 font-body text-[12.5px] font-medium whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:h-8 sm:px-3"
          >
            <span className="sm:hidden">{pendingCount} pending</span>
            <span className="hidden sm:inline">
              {pendingCount} pending approval{pendingCount === 1 ? "" : "s"}
            </span>
          </Link>
          <UserMenu name={name} email={email} isAdmin={true} onAdminSide={true} />
        </div>

        {emailMode && emailMode !== "live" && (
          <Link
            href="/admin/settings/notifications"
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 bg-flame px-4 text-center font-body text-[12.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {emailMode === "off"
              ? "Email mode is OFF — no emails are being sent to anyone."
              : "Email mode is TEST — every email is redirected to the test recipients, not real students."}
            <span className="underline">Change in Settings</span>
          </Link>
        )}

        <main className="flex-1 px-4 pt-6.5 pb-7.5 sm:px-6">{children}</main>

        <AdminBottomBar pendingCount={pendingCount} />
      </div>
    </div>
  );
}
