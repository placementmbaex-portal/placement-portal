"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Setup tasks, used once or occasionally -- deliberately separate from
// the daily-work sidebar (DESIGN.md's Navigation section). Six sections,
// one left sub-nav, content pane to the right.
const ITEMS = [
  { href: "/admin/settings/access", label: "Access" },
  { href: "/admin/settings/profile-fields", label: "Profile fields" },
  { href: "/admin/settings/import", label: "Import" },
  { href: "/admin/settings/notifications", label: "Notifications" },
  { href: "/admin/settings/general", label: "General" },
  { href: "/admin/settings/trash", label: "Trash" },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const atIndex = pathname === "/admin/settings";

  return (
    <>
      {/* Desktop: a real left sub-nav, always visible alongside whichever
          section's content is showing. */}
      <nav className="hidden w-[176px] shrink-0 flex-col gap-0.5 md:flex">
        <p className="mb-1.5 px-3 font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Settings
        </p>
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center rounded-md px-3 font-body text-[13.5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                active ? "bg-paper font-semibold text-ink" : "font-medium text-slate hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: the sub-nav collapses to nothing here -- the index page's
          own card list is the "list" (DESIGN.md), and each section page
          just gets a way back to it. */}
      {!atIndex && (
        <Link
          href="/admin/settings"
          className="flex h-9 w-fit items-center text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
        >
          ← Settings
        </Link>
      )}
    </>
  );
}
