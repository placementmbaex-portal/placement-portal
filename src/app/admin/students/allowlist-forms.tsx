"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  addAllowedStudent,
  bulkAddAllowedStudents,
  removeAllowedStudent,
  type AllowlistFormState,
  type BulkAllowlistState,
  type RemoveAllowlistState,
} from "./actions";

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

const addInitialState: AllowlistFormState = null;
const bulkInitialState: BulkAllowlistState = null;
const removeInitialState: RemoveAllowlistState = null;

export function AddAllowlistForm() {
  const [state, formAction, pending] = useActionState(addAllowedStudent, addInitialState);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3.5 rounded-xl border border-rule bg-surface p-4.5 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="allow_email" className={labelClass}>
          Email
        </label>
        <input id="allow_email" name="email" type="email" required className={fieldClass} />
      </div>
      <div>
        <label htmlFor="allow_name" className={labelClass}>
          Name
        </label>
        <input id="allow_name" name="name" required className={fieldClass} />
      </div>
      <div>
        <label htmlFor="allow_roll_no" className={labelClass}>
          Roll no. (optional)
        </label>
        <input id="allow_roll_no" name="roll_no" className={fieldClass} />
      </div>
      <div>
        <label htmlFor="allow_experience" className={labelClass}>
          Experience, years (optional)
        </label>
        <input
          id="allow_experience"
          name="total_experience_years"
          type="number"
          step="0.5"
          min="0"
          className={`${fieldClass} tabular-nums`}
        />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 text-[13px] text-closing">{state.error}</p>
      )}
      {state?.success && <p className="sm:col-span-2 text-[13px] text-live">Added.</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white disabled:opacity-60 sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {pending ? "Adding…" : "Add to allowlist"}
        </button>
      </div>
    </form>
  );
}

export function BulkAddAllowlistForm() {
  const [state, formAction, pending] = useActionState(bulkAddAllowedStudents, bulkInitialState);

  return (
    <form action={formAction} className="rounded-xl border border-rule bg-surface p-4.5">
      <label htmlFor="bulk" className={labelClass}>
        Email, name, roll no, experience — one per line
      </label>
      <textarea
        id="bulk"
        name="bulk"
        rows={5}
        placeholder={"jane@email.iimcal.ac.in, Jane Doe, MBAEx01/26, 3.5\njohn@email.iimcal.ac.in, John Roe, MBAEx02/26"}
        className="w-full rounded-md border border-rule px-3 py-2.5 font-mono text-[13px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
      />
      <p className="mt-1.5 text-[11.5px] text-shut">
        Roll no. and experience may be left blank. Re-pasting an email already on the list
        updates that row instead of erroring.
      </p>
      {state?.error && <p className="mt-2 text-[13px] text-closing">{state.error}</p>}
      {state?.added !== undefined && (
        <p className="mt-2 text-[13px] text-live">
          Added {state.added} student{state.added === 1 ? "" : "s"}.
        </p>
      )}
      {state?.skipped && state.skipped.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5">
          <p className="text-[12.5px] font-medium text-closing">
            {state.skipped.length} line{state.skipped.length === 1 ? "" : "s"} skipped:
          </p>
          <ul className="flex flex-col gap-0.5">
            {state.skipped.map((s, i) => (
              <li key={i} className="text-[12px] text-closing">
                &ldquo;{s.line}&rdquo; — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 flex h-11 items-center rounded-md border border-navy px-4.5 font-body text-[14px] font-semibold text-navy disabled:opacity-60 sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? "Adding…" : "Bulk add"}
      </button>
    </form>
  );
}

export function RemoveAllowlistButton({ email }: { email: string }) {
  const [state, formAction] = useActionState(
    removeAllowedStudent.bind(null, email),
    removeInitialState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-0.5">
      <ConfirmSubmitButton
        confirmMessage={`Remove ${email} from the allowlist? They will no longer be able to sign in for the first time.`}
        pendingLabel="…"
        className="text-closing underline underline-offset-2 disabled:text-shut disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Remove
      </ConfirmSubmitButton>
      {state?.error && <p className="text-[11.5px] text-closing">{state.error}</p>}
    </form>
  );
}
