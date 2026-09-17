"use client";

import { useState, useTransition } from "react";
import { setEmailMode } from "./actions";

const MODES: { value: "off" | "test" | "live"; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "Nothing is sent. Every event still logs as suppressed." },
  { value: "test", label: "Test", description: "Every email is redirected to the test recipients below." },
  { value: "live", label: "Live", description: "Emails go to real students." },
];

export function EmailModeSelector({ mode }: { mode: "off" | "test" | "live" }) {
  const [current, setCurrent] = useState(mode);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = current === m.value;
          return (
            <button
              key={m.value}
              type="button"
              disabled={pending}
              onClick={() => {
                if (m.value === "live" && !window.confirm("Switch to live? Real students will start receiving email.")) {
                  return;
                }
                setCurrent(m.value);
                startTransition(() => {
                  void setEmailMode(m.value);
                });
              }}
              className={`flex h-9 items-center rounded-full px-4 font-body text-[13px] font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                active
                  ? "bg-navy text-white focus-visible:outline-white"
                  : "border border-rule bg-surface text-ink focus-visible:outline-ink"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] leading-[1.5] text-slate">
        {MODES.find((m) => m.value === current)?.description}
      </p>
    </div>
  );
}
