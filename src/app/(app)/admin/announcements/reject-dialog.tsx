"use client";

import { useActionState, useRef } from "react";
import { rejectAnnouncement, type RejectState } from "./actions";

const initialState: RejectState = null;

export function RejectDialog({ announcementId }: { announcementId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(
    rejectAnnouncement.bind(null, announcementId),
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-[15px] text-closing underline underline-offset-2"
      >
        Reject
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-md border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/40"
      >
        <form action={action} className="space-y-4 p-5">
          <h2 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
            Reject this announcement
          </h2>
          <div>
            <label
              htmlFor="reason"
              className="block text-[13.5px] leading-[1.45] text-slate"
            >
              Reason
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
              className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
          </div>
          {state?.error && (
            <p className="text-[13.5px] text-closing">{state.error}</p>
          )}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-[15px] text-slate hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {pending ? "Rejecting…" : "Reject with this reason"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
