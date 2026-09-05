import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();

  const [
    { count: studentCount },
    { count: companyCount },
    { count: openJobCount },
    { count: applicationCount },
    { count: pendingAnnouncementCount },
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_open", true),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const stats = [
    { label: "Students registered", value: studentCount ?? 0 },
    { label: "Companies", value: companyCount ?? 0 },
    { label: "Open jobs", value: openJobCount ?? 0 },
    { label: "Total applications", value: applicationCount ?? 0 },
    { label: "Pending announcements", value: pendingAnnouncementCount ?? 0 },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <nav className="flex flex-col gap-2">
        <Link
          href="/admin/companies"
          className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Companies
        </Link>
        <Link
          href="/admin/jobs"
          className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Jobs
        </Link>
        <Link
          href="/admin/announcements"
          className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Announcements
        </Link>
      </nav>
    </main>
  );
}
