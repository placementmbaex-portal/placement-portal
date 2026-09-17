"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Same trigger, same dropdown shape, on both sides of the portal (DESIGN
// (1).md's Navigation section) -- both call sites (the admin shell's own
// white top bar, and the student header) sit on a light background, so
// there's just the one colour scheme; only which "switch" item makes
// sense changes per call site.
export function UserMenu({
  name,
  email,
  isAdmin,
  onAdminSide,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  onAdminSide: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="flex h-11 items-center gap-1 rounded-md px-1.5 font-body text-[13.5px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:h-8"
      >
        <span className="max-w-[104px] truncate">{firstName}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-30 w-[240px] overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_8px_24px_rgba(11,37,69,0.16)]">
          <div className="border-b border-rule px-4 py-3">
            <p className="truncate text-[13.5px] font-semibold text-ink">{name}</p>
            <p className="truncate text-[12px] text-slate">{email}</p>
          </div>

          <div className="flex flex-col py-1.5">
            {isAdmin && (
              <Link
                href={onAdminSide ? "/" : "/admin"}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center px-4 text-[13.5px] text-ink hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
              >
                {onAdminSide ? "Switch to student view" : "Switch to admin view"}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/settings"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center px-4 text-[13.5px] text-ink hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
              >
                Settings
              </Link>
            )}
          </div>

          <div className="h-px bg-rule" />

          <div className="py-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-11 w-full items-center px-4 text-left text-[13.5px] text-ink hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
