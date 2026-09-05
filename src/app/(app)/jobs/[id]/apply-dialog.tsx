"use client";

import { useActionState, useRef } from "react";
import { applyToJob, type ApplyState } from "./actions";

const initialState: ApplyState = null;

export function ApplyDialog({
  jobId,
  cvs,
}: {
  jobId: string;
  cvs: { id: string; label: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(
    applyToJob.bind(null, jobId),
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Apply
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-md border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/40"
      >
        <form action={action} className="space-y-4 p-5">
          <h2 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
            Apply with which CV?
          </h2>
          <div>
            <label
              htmlFor="cv_id"
              className="block text-[13.5px] leading-[1.45] text-slate"
            >
              CV
            </label>
            <select
              id="cv_id"
              name="cv_id"
              required
              defaultValue=""
              className="mt-1 h-10 w-full rounded-md border border-rule bg-surface px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            >
              <option value="" disabled>
                Choose a CV
              </option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.label}
                </option>
              ))}
            </select>
          </div>
          {state?.error && (
            <p className="text-[13.5px] leading-[1.45] text-closing">
              {state.error}
            </p>
          )}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-[15px] text-slate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {pending ? "Applying…" : "Apply with this CV"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
