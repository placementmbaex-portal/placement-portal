"use client";

import { useActionState, useRef } from "react";
import { formatDateIST } from "@/lib/format";
import { applyToJob, type ApplyState } from "./actions";

const initialState: ApplyState = null;

export function ApplyDialog({
  jobId,
  cvs,
}: {
  jobId: string;
  cvs: { id: string; label: string; createdAt: string }[];
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
        className="flex h-11 items-center justify-center rounded-lg bg-navy px-4 font-body text-[15px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Apply
      </button>

      {/* A bottom sheet: same <dialog> element and open/close logic as
          before, restyled to dock at the viewport bottom instead of
          centering (see DESIGN.md via the mobile handoff README). */}
      <dialog
        ref={dialogRef}
        className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-[390px] rounded-t-[20px] border-0 bg-surface p-0 shadow-[0_-4px_24px_rgba(11,37,69,0.2)] backdrop:bg-ink/45"
      >
        <form action={action} className="p-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
          <h2 className="font-display text-[19px] leading-[1.3] font-semibold text-ink">
            Apply with which CV?
          </h2>

          <div className="mt-3.5 flex flex-col gap-2">
            {cvs.map((cv, index) => (
              <label
                key={cv.id}
                className="flex items-center gap-3 rounded-[10px] border border-rule p-3.5 has-[:checked]:border-2 has-[:checked]:border-navy has-[:checked]:bg-[#F5F8FB] has-[:checked]:p-[13px]"
              >
                <input
                  type="radio"
                  name="cv_id"
                  value={cv.id}
                  required
                  defaultChecked={index === 0}
                  className="peer sr-only"
                />
                <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-shut bg-surface peer-checked:border-[6px] peer-checked:border-navy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium text-ink">
                    {cv.label}
                  </p>
                  <p className="mt-px text-[12px] text-slate">
                    Uploaded {formatDateIST(cv.createdAt)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {state?.error && (
            <p className="mt-3 text-[13.5px] leading-[1.45] text-closing">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-[10px] bg-navy font-body text-[15.5px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Applying…" : "Apply with this CV"}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-1 flex h-11 w-full items-center justify-center font-body text-[14.5px] font-medium text-slate"
          >
            Cancel
          </button>
        </form>
      </dialog>
    </>
  );
}
