"use client";

import { useActionState } from "react";
import { ConfirmFormButton } from "@/components/confirm-form-button";
import { bulkUpdateStatus, type BulkStatusState } from "./actions";

const initialState: BulkStatusState = null;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "in_process", label: "In process" },
  { value: "offer", label: "Offer" },
  { value: "not_selected", label: "Not selected" },
];

export const BULK_STATUS_FORM_ID = "bulk-status-form";

export function BulkStatusForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState(
    bulkUpdateStatus.bind(null, jobId),
    initialState,
  );

  return (
    <form
      id={BULK_STATUS_FORM_ID}
      action={action}
      className="mt-4 flex flex-wrap items-center gap-3"
    >
      <label htmlFor="bulk-status" className="text-[13.5px] text-slate">
        Set status for selected to
      </label>
      <select
        id="bulk-status"
        name="status"
        required
        defaultValue=""
        className="h-10 rounded-md border border-rule px-3 text-[13.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
      >
        <option value="" disabled>
          Choose…
        </option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ConfirmFormButton
        formId={BULK_STATUS_FORM_ID}
        confirmMessage="Update status for every selected applicant?"
        disabled={pending}
        className="flex h-10 items-center rounded-md bg-navy px-4 text-[13.5px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? "Updating…" : "Update selected"}
      </ConfirmFormButton>
      {state?.error && (
        <p className="w-full text-[13.5px] text-closing">{state.error}</p>
      )}
    </form>
  );
}
