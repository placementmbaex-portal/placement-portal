"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toggleJobOpen } from "./actions";
import { DeleteJobModal } from "./delete-job-modal";

export function JobRowMenu({
  jobId,
  jobTitle,
  companyName,
  isOpen,
  impact,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  isOpen: boolean;
  impact: { applications: number; events: number };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickAway(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="More actions"
        className="flex h-11 w-8 items-center justify-center text-[15px] tracking-[0.12em] text-slate sm:h-8"
      >
        &middot;&middot;&middot;
      </button>
      {menuOpen && (
        <div className="absolute right-0 z-20 mt-1 w-[200px] overflow-hidden rounded-md border border-rule bg-surface text-left shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
          <form action={toggleJobOpen.bind(null, jobId, !isOpen)}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center px-3.5 text-left text-[13px] text-ink hover:bg-paper"
            >
              {isOpen ? "Close applications" : "Reopen applications"}
            </button>
          </form>
          <Link
            href={`/admin/jobs/${jobId}/applicants/export`}
            className="flex min-h-11 items-center px-3.5 text-[13px] text-ink hover:bg-paper"
          >
            Export applicants
          </Link>
          <div className="h-px bg-rule" />
          <DeleteJobModal
            jobId={jobId}
            jobTitle={jobTitle}
            companyName={companyName}
            impact={impact}
            onOpen={() => setMenuOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
