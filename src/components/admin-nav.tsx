"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Daily work only (DESIGN (1).md's Navigation section) -- everything else
// (Students, Profile fields, Import, Trash, Settings, Email log) now lives
// under Settings, reached through the user menu, not this list.
const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/events", label: "Events" },
];

function useActiveHref() {
  const pathname = usePathname();
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

// Desktop: a real left sidebar, brown, the active item at full white with
// the 2px flame left rule DESIGN (1).md calls for; everything else at 80%
// opacity white.
export function AdminSidebar({ pendingCount }: { pendingCount: number }) {
  const isActive = useActiveHref();

  return (
    <nav className="hidden w-[212px] shrink-0 flex-col bg-brown md:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper">
          <Image
            src="/logo-iimc.svg"
            alt="IIM Calcutta"
            width={26}
            height={26}
            className="h-[26px] w-[26px] object-contain"
          />
        </span>
        <span className="font-body text-[15px] font-bold whitespace-nowrap text-white">
          MBA<span className="text-flame">Ex</span>
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-2 pt-2 pb-4">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center gap-1.5 border-l-2 pl-3.5 font-body text-[13.5px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                active ? "border-flame font-semibold text-white" : "border-transparent font-medium text-white/80"
              }`}
            >
              {item.label}
              {item.href === "/admin/announcements" && pendingCount > 0 && (
                <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-flame px-1 font-body text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Mobile: the same five items as a bottom bar, in normal document flow
// (not fixed) -- placed last in the layout's column so it lands at the
// bottom the same way the student BottomNav does.
export function AdminBottomBar({ pendingCount }: { pendingCount: number }) {
  const isActive = useActiveHref();

  return (
    <nav className="flex h-14 shrink-0 items-stretch bg-brown md:hidden">
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 items-center justify-center px-1 text-center font-body text-[11px] whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
              active ? "font-semibold text-white" : "font-medium text-white/80"
            }`}
          >
            {item.label}
            {item.href === "/admin/announcements" && pendingCount > 0 && (
              <span className="absolute top-1 right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-flame px-1 font-body text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
