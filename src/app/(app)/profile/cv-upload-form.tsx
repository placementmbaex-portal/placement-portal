"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadCv, type UploadCvState } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const initialState: UploadCvState = null;

export function CvUploadForm({ slotsLeft }: { slotsLeft: number }) {
  const [state, action, pending] = useActionState(uploadCv, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // "Adjusting state when a prop changes" pattern (react.dev) rather than
  // an effect: setState during an effect body for this would cascade an
  // extra render, and `state` only ever changes on a genuine action
  // result, so this can't loop.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state?.success) setFileName(null);
  }

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setClientError(null);
      setFileName(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setClientError("Only PDF files are allowed.");
      e.target.value = "";
      setFileName(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError("File must be 2MB or smaller.");
      e.target.value = "";
      setFileName(null);
      return;
    }
    setClientError(null);
    setFileName(file.name);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (clientError) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <div className="space-y-1">
        <label htmlFor="label" className="mb-[5px] block text-[12px] text-slate">
          Label
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          placeholder="e.g. General CV"
          className="flex h-11 w-full items-center rounded-lg border border-rule bg-surface px-3 text-[14.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>

      {/* The upload target reads as a button, not a bare file input: a
          real <label> wraps a visually-hidden <input type="file">, so the
          whole panel is one large, obviously-tappable target. */}
      <label
        htmlFor="file"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-navy bg-[#F5F8FB] py-[18px] px-3.5 text-center"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </span>
        <span className="font-body text-[15px] font-semibold text-navy">
          {fileName ?? "Upload a CV"}
        </span>
        <span className="text-[12px] text-slate">
          PDF, up to 2 MB · {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left
        </span>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      {(clientError || state?.error) && (
        <p className="text-[13px] text-closing">
          {clientError ?? state?.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !!clientError}
        className="flex h-11 items-center justify-center rounded-lg bg-navy font-body text-[14.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
