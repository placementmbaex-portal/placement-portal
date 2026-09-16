"use client";

import { useState } from "react";

export type StatusHistoryEntry = { label: string; date: string };

// Collapsed, this IS the compact line the spec asks for -- "Shortlisted,
// 12 Mar" -- just the most recent entry. Expanding reveals the full
// chronological list beneath it.
export function StatusHistory({ entries }: { entries: StatusHistoryEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  const latest = entries[entries.length - 1];

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 items-center gap-1 text-[12.5px] text-navy sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span>
          {latest.label}, {latest.date}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ol className="mt-1.5 flex flex-col gap-1 border-l border-rule pl-3">
          {entries.map((entry, i) => (
            <li key={i} className="text-[12px] text-slate">
              {entry.label}, {entry.date}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
