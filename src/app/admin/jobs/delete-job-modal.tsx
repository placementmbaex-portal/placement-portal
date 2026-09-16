"use client";

import { useActionState, useRef, useState } from "react";
import { deleteJob, toggleJobOpen, type DeleteJobState } from "./actions";

const initialState: DeleteJobState = null;

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function DeleteJobModal({
  jobId,
  jobTitle,
  companyName,
  impact,
  onOpen,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  impact: { applications: number; events: number };
  onOpen?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typedTitle, setTypedTitle] = useState("");
  const [state, action, pending] = useActionState(
    deleteJob.bind(null, jobId, jobTitle),
    initialState,
  );

  const canDelete = typedTitle === jobTitle;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          dialogRef.current?.showModal();
        }}
        className="flex min-h-11 w-full items-center px-3.5 text-left font-body text-[13px] font-medium text-closing hover:bg-[#FDEAE0]"
      >
        Delete role&hellip;
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-[520px] rounded-lg border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/42"
      >
        <div className="px-6 pt-5.5">
          <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
            Delete &ldquo;{jobTitle}&rdquo; at {companyName}?
          </h2>
          <p className="mt-2.5 text-[14px] leading-[1.6] text-ink">
            This job has {plural(impact.applications, "application")} and{" "}
            {plural(impact.events, "linked event")}. They will be hidden but not destroyed —
            restore it from Trash any time.
          </p>

          <div className="mt-4 flex items-start gap-3 rounded-md border border-rule px-4 py-3.5">
            <div className="flex-1">
              <p className="text-[13.5px] font-medium text-ink">Close it instead?</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.5] text-slate">
                Closing hides the role from students but keeps it in your regular jobs list,
                with every application and offer on record.
              </p>
            </div>
            <form action={toggleJobOpen.bind(null, jobId, false)}>
              <button
                type="submit"
                onClick={() => dialogRef.current?.close()}
                className="flex h-11 shrink-0 items-center rounded-md border border-navy px-3.5 font-body text-[13px] font-semibold text-navy sm:h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Close role
              </button>
            </form>
          </div>

          <form action={action} className="mt-4.5">
            <label htmlFor="confirm_title" className="mb-1.5 block text-[13px] text-slate">
              Type <span className="font-mono text-[13px] font-semibold text-ink">{jobTitle}</span> to confirm
            </label>
            <input
              id="confirm_title"
              name="confirm_title"
              autoComplete="off"
              value={typedTitle}
              onChange={(e) => setTypedTitle(e.target.value)}
              placeholder="Role title"
              className="h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
            {state?.error && (
              <p className="mt-2 text-[13.5px] text-closing">{state.error}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-4.5 border-t border-rule py-4.5">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canDelete || pending}
                className="flex h-11 items-center text-[14px] font-semibold text-closing underline underline-offset-2 disabled:text-shut disabled:no-underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {pending ? "Deleting…" : "Delete role"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
