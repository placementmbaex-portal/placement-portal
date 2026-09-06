"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Home",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/announcements",
    label: "Notices",
    icon: (
      <>
        <path d="M18 15V10a6 6 0 0 0-12 0v5l-2 3h16z" />
        <path d="M10 21h4" />
      </>
    ),
  },
  {
    href: "/jobs",
    label: "Roles",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5h6v2" />
      </>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 grid grid-cols-5 border-t border-rule bg-surface pt-2 pb-3.5">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-11 flex-col items-center gap-1 ${active ? "text-navy" : "text-shut"}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            <span className="font-body text-[10.5px] font-semibold">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
