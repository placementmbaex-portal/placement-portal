"use client";

import { useState } from "react";
import { updateEmailNotifications } from "./actions";

export function EmailNotificationsToggle({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-surface p-3.5">
      <div>
        <p className="text-[14px] font-medium text-ink">Email notifications</p>
        <p className="mt-0.5 text-[12px] leading-[1.45] text-slate">
          Deadline reminders are always sent, even when this is off.
        </p>
        {error && <p className="mt-1 text-[12px] text-closing">{error}</p>}
      </div>
      <label className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="sr-only">Email notifications</span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const next = e.target.checked;
            setChecked(next);
            setError(null);
            void updateEmailNotifications(next).then((result) => {
              if (result?.error) {
                setChecked(!next);
                setError(result.error);
              }
            });
          }}
          className="h-4 w-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>
    </div>
  );
}
