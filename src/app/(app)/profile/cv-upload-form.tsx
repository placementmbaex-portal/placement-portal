"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadCv, type UploadCvState } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const initialState: UploadCvState = null;

export function CvUploadForm() {
  const [state, action, pending] = useActionState(uploadCv, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setClientError(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setClientError("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError("File must be 2MB or smaller.");
      e.target.value = "";
      return;
    }
    setClientError(null);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (clientError) e.preventDefault();
      }}
      className="space-y-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      <h3 className="text-sm font-medium text-zinc-500">Upload a CV</h3>
      <div className="space-y-1">
        <label htmlFor="label" className="block text-sm font-medium">
          Label
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          placeholder="e.g. General CV"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="file" className="block text-sm font-medium">
          PDF file (max 2MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
      </div>
      {(clientError || state?.error) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {clientError ?? state?.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !!clientError}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
