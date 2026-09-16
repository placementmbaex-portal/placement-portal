"use client";

import { useActionState } from "react";
import { updateEmailDefaults, type EmailDefaultsState } from "./actions";

const initialState: EmailDefaultsState = null;
const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

export function EmailDefaultsForm({
  emailFrom,
  announcementEmailDefault,
}: {
  emailFrom: string;
  announcementEmailDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateEmailDefaults, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div className="max-w-sm">
        <label htmlFor="email_from" className={labelClass}>
          From-address
        </label>
        <input
          id="email_from"
          name="email_from"
          type="email"
          required
          defaultValue={emailFrom}
          className={fieldClass}
        />
        <p className="mt-1.25 text-[11.5px] text-shut">Must be on a domain verified with Resend.</p>
      </div>

      <label className="flex items-center gap-2.5 text-[14px] text-ink">
        <input
          type="checkbox"
          name="announcement_email_default"
          defaultChecked={announcementEmailDefault}
          className="h-4 w-4"
        />
        Notify students by email when an announcement is approved, by default
      </label>

      <div>
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
