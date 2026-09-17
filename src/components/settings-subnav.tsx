"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The six pages DESIGN (1).md's Navigation section moved out of the main
// sidebar and "under Settings" -- reached from the user menu's Settings
// item, not from daily-work navigation. This row is what keeps them from
// becoming orphaned: it appears at the top of each of the six pages so
// moving between them doesn't require going back through the user menu
// every time.
const ITEMS = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/profile-fields", label: "Profile fields" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/email-log", label: "Email log" },
  { href: "/admin/trash", label: "Trash" },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <div
      className="-mx-4 mb-5 flex gap-0.5 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0"
      style={{ scrollbarWidth: "none" }}
    >
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-11 shrink-0 items-center border-b-2 px-3.5 font-body text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:h-10 ${
              active ? "border-navy font-semibold text-ink" : "border-transparent font-medium text-slate"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
