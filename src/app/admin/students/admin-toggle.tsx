"use client";

import { useState } from "react";
import { toggleAdmin } from "./actions";

export function AdminToggle({
  studentId,
  studentName,
  isAdmin,
}: {
  studentId: string;
  studentName: string;
  isAdmin: boolean;
}) {
  const [checked, setChecked] = useState(isAdmin);
  const [prevIsAdmin, setPrevIsAdmin] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);

  if (isAdmin !== prevIsAdmin) {
    setPrevIsAdmin(isAdmin);
    setChecked(isAdmin);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2">
        <span className="sr-only">Admin access for {studentName}</span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const next = e.target.checked;
            if (next && !window.confirm(`Give ${studentName} admin access?`)) {
              return;
            }
            setChecked(next);
            setError(null);
            void toggleAdmin(studentId, next).then((result) => {
              if (result?.error) {
                setChecked(!next);
                setError(result.error);
              }
            });
          }}
          className="h-4 w-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>
      {error && <p className="max-w-[220px] text-right text-[11.5px] text-closing">{error}</p>}
    </div>
  );
}
