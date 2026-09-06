"use client";

import { useFormStatus } from "react-dom";

export function OpenToggleButton({ isOpen }: { isOpen: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        isOpen
          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60 dark:bg-emerald-900 dark:text-emerald-300"
          : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-300"
      }
    >
      {pending ? "…" : isOpen ? "Open" : "Closed"}
    </button>
  );
}
