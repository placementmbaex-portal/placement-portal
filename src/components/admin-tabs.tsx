"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/profile-fields", label: "Fields" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/trash", label: "Trash" },
];

export function AdminTabs({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <div
      className="-mx-4 flex gap-0.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      style={{ scrollbarWidth: "none" }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3.5 font-body text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-10 ${
              active
                ? "border-flame font-semibold text-white"
                : "border-transparent font-medium text-white/72"
            }`}
          >
            {tab.label}
            {tab.href === "/admin/announcements" && pendingCount > 0 && (
              <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-flame px-1 font-body text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
