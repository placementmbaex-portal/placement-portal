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
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Apply
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-zinc-200 p-0 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <form action={action} className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Apply with which CV?
          </h2>
          <select
            name="cv_id"
            required
            defaultValue=""
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-sm text-zinc-500 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Applying…" : "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
