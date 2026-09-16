"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteCompany, type DeleteCompanyState } from "./actions";

const initialState: DeleteCompanyState = null;

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function DeleteCompanyModal({
  companyId,
  companyName,
  impact,
  triggerClassName,
}: {
  companyId: string;
  companyName: string;
  impact: { jobs: number; applications: number; events: number };
  triggerClassName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [state, action, pending] = useActionState(
    deleteCompany.bind(null, companyId, companyName),
    initialState,
  );

  // The dialog's own ESC/backdrop dismissal changes its DOM open state
  // without going through React, so `open` is synced here rather than
  // ever read from the ref during render -- the ref itself is only ever
  // touched inside this effect and the Cancel button's click handler,
  // never in a value passed through the `trigger` render prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  const canDelete = typedName === companyName;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        Delete
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="w-full max-w-[520px] rounded-lg border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/42"
      >
        <div className="px-6 pt-5.5">
          <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
            Delete {companyName}?
          </h2>
          <p className="mt-2.5 text-[14px] leading-[1.6] text-ink">
            This company has {plural(impact.jobs, "job")},{" "}
            {plural(impact.applications, "application")} and{" "}
            {plural(impact.events, "linked event")}. They will be hidden but not destroyed —
            restore it from Trash any time.
          </p>
          <p className="mt-2.5 rounded-md border border-rule bg-paper px-3.5 py-2.5 text-[13.5px] leading-[1.5] text-ink">
            Deleting this company also hides its {plural(impact.jobs, "job")}. Restoring the
            company restores them too.
          </p>

          <form action={action} className="mt-4.5">
            <label htmlFor={`confirm_name_${companyId}`} className="mb-1.5 block text-[13px] text-slate">
              Type <span className="font-mono text-[13px] font-semibold text-ink">{companyName}</span> to confirm
            </label>
            <input
              id={`confirm_name_${companyId}`}
              name="confirm_name"
              autoComplete="off"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Company name"
              className="h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
            {state?.error && (
              <p className="mt-2 text-[13.5px] text-closing">{state.error}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-4.5 border-t border-rule py-4.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canDelete || pending}
                className="flex h-11 items-center text-[14px] font-semibold text-closing underline underline-offset-2 disabled:text-shut disabled:no-underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {pending ? "Deleting…" : "Delete company"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
