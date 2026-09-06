"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  previewShortlist,
  confirmShortlist,
  type ShortlistPreviewState,
  type ShortlistConfirmState,
} from "./actions";

const initialPreviewState: ShortlistPreviewState = null;
const initialConfirmState: ShortlistConfirmState = null;

export function ShortlistUploadForm({ jobId }: { jobId: string }) {
  const [previewState, previewAction, previewPending] = useActionState(
    previewShortlist.bind(null, jobId),
    initialPreviewState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmShortlist.bind(null, jobId),
    initialConfirmState,
  );
  const inputFormRef = useRef<HTMLFormElement>(null);
  const [dismissed, setDismissed] = useState(false);

  // "Adjusting state when a prop changes" pattern (react.dev) rather than
  // an effect: setState during an effect body for this would cascade an
  // extra render, and confirmState only ever changes on a genuine action
  // result, so this can't loop.
  const [lastConfirmState, setLastConfirmState] = useState(confirmState);
  if (confirmState !== lastConfirmState) {
    setLastConfirmState(confirmState);
    if (confirmState?.success) setDismissed(true);
  }

  useEffect(() => {
    if (confirmState?.success) {
      inputFormRef.current?.reset();
    }
  }, [confirmState]);

  const matched = previewState?.matched ?? [];
  const unmatched = previewState?.unmatched ?? [];
  const showingPreview =
    !dismissed && previewState && !previewState.error && (matched.length > 0 || unmatched.length > 0);

  if (showingPreview) {
    return (
      <div className="mt-6 space-y-4 border-t border-rule pt-6">
        <h3 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
          Preview
        </h3>

        {matched.length > 0 && (
          <div>
            <p className="text-[13.5px] leading-[1.45] text-slate">
              Matched ({matched.length})
            </p>
            <ul className="mt-1 text-[15px] leading-[1.55] text-ink">
              {matched.map((entry) => (
                <li key={entry.applicationId}>
                  {entry.name}
                  {entry.rollNo ? ` (${entry.rollNo})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {unmatched.length > 0 && (
          <div>
            <p className="text-[13.5px] leading-[1.45] text-closing">
              Not matched ({unmatched.length})
            </p>
            <ul className="mt-1 text-[15px] leading-[1.55] text-ink">
              {unmatched.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={confirmAction} className="flex flex-wrap items-center gap-4">
          {matched.map((entry) => (
            <input
              key={entry.applicationId}
              type="hidden"
              name="application_ids"
              value={entry.applicationId}
            />
          ))}
          <button
            type="submit"
            disabled={confirmPending || matched.length === 0}
            className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {confirmPending
              ? "Marking…"
              : `Confirm and mark ${matched.length} shortlisted`}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[15px] text-slate hover:underline"
          >
            Cancel
          </button>
          {confirmState?.error && (
            <p className="w-full text-[13.5px] text-closing">
              {confirmState.error}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <form
      ref={inputFormRef}
      action={previewAction}
      onSubmit={() => setDismissed(false)}
      className="mt-6 max-w-xl space-y-3 border-t border-rule pt-6"
    >
      <h3 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
        Mark shortlisted in bulk
      </h3>
      <div className="space-y-1">
        <label htmlFor="identifiers" className="block text-[13.5px] text-slate">
          Emails or roll numbers, one per line
        </label>
        <textarea
          id="identifiers"
          name="identifiers"
          rows={5}
          className="w-full rounded-md border border-rule px-3 py-2 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="csv" className="block text-[13.5px] text-slate">
          Or upload a CSV
        </label>
        <input
          id="csv"
          name="csv"
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-[15px] text-ink"
        />
      </div>
      {previewState?.error && (
        <p className="text-[13.5px] text-closing">{previewState.error}</p>
      )}
      <button
        type="submit"
        disabled={previewPending}
        className="flex h-10 items-center rounded-md border border-navy px-4 text-[15px] font-medium text-navy hover:bg-surface disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {previewPending ? "Matching…" : "Preview"}
      </button>
    </form>
  );
}
