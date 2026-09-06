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
];

export function AdminTabs({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-0.5">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex h-10 items-center gap-1.5 border-b-2 px-3.5 font-body text-[13px] ${
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
