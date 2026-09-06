"use client";

import { useActionState, useRef, useState } from "react";
import { deleteJob, toggleJobOpen, type DeleteJobState } from "./actions";

const initialState: DeleteJobState = null;

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
  impact: { applications: number; offers: number; events: number; announcements: number };
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
        className="block w-full px-3.5 py-2.5 text-left font-body text-[13px] font-medium text-closing hover:bg-[#FDEAE0]"
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
            This cannot be undone. Deleting the role will:
          </p>
          <div className="mt-3.5 flex flex-col gap-2 rounded-md border border-[rgba(251,88,19,0.28)] bg-[#FDEAE0] px-4 py-3.5">
            <div className="flex justify-between">
              <span className="text-[13.5px] text-ink">Delete applications from students</span>
              <span className="font-body text-[13.5px] font-semibold tabular-nums text-closing">
                {impact.applications}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px] text-ink">Delete recorded offers</span>
              <span className="font-body text-[13.5px] font-semibold tabular-nums text-closing">
                {impact.offers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px] text-ink">Unlink calendar events</span>
              <span className="font-body text-[13.5px] font-semibold tabular-nums text-closing">
                {impact.events}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px] text-ink">Unlink announcements referencing this role</span>
              <span className="font-body text-[13.5px] font-semibold tabular-nums text-closing">
                {impact.announcements}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-md border border-rule px-4 py-3.5">
            <div className="flex-1">
              <p className="text-[13.5px] font-medium text-ink">Close it instead?</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.5] text-slate">
                Closing hides the role from students and keeps every application and offer on record.
              </p>
            </div>
            <form action={toggleJobOpen.bind(null, jobId, false)}>
              <button
                type="submit"
                onClick={() => dialogRef.current?.close()}
                className="flex h-9 shrink-0 items-center rounded-md border border-navy px-3.5 font-body text-[13px] font-semibold text-navy"
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
                className="text-[14px] text-slate hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canDelete || pending}
                className="flex h-10 items-center rounded-md bg-closing px-4.5 font-body text-[14px] font-semibold text-white disabled:bg-[#ECEFF3] disabled:text-shut"
              >
                {pending ? "Deleting…" : `Delete role and ${impact.applications} applications`}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
