"use client";

import { useActionState, useState } from "react";
import { updateTestRecipients, type TestRecipientsState } from "./actions";

const initialState: TestRecipientsState = null;
const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";

export function TestRecipientsForm({ recipients }: { recipients: string[] }) {
  const [state, formAction, pending] = useActionState(updateTestRecipients, initialState);
  const [emails, setEmails] = useState<string[]>(recipients.length > 0 ? recipients : [""]);

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      {emails.map((email, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="email"
            name="recipient"
            aria-label={`Test recipient ${index + 1}`}
            value={email}
            onChange={(e) => {
              const next = [...emails];
              next[index] = e.target.value;
              setEmails(next);
            }}
            placeholder="name@example.com"
            className={fieldClass}
          />
          <button
            type="button"
            onClick={() => setEmails(emails.filter((_, i) => i !== index))}
            disabled={emails.length === 1}
            aria-label={`Remove recipient ${index + 1}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[18px] text-closing disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setEmails([...emails, ""])}
          className="flex h-9 items-center rounded-md border border-navy px-3 font-body text-[13px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Add recipient
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex h-9 items-center rounded-md bg-navy px-4 font-body text-[13px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <p className="text-[13px] text-closing">{state.error}</p>}
      {state?.success && <p className="text-[13px] text-live">Saved.</p>}
    </form>
  );
}
