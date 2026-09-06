"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = null;

export function ProfileForm({
  phone,
  linkedin,
}: {
  phone: string | null;
  linkedin: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <div>
        <label
          htmlFor="phone"
          className="mb-[5px] block text-[12px] text-slate"
        >
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          className="flex h-11 w-full items-center rounded-lg border border-rule bg-surface px-3 text-[14.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>
      <div>
        <label
          htmlFor="linkedin"
          className="mb-[5px] block text-[12px] text-slate"
        >
          LinkedIn
        </label>
        <input
          id="linkedin"
          name="linkedin"
          type="text"
          defaultValue={linkedin ?? ""}
          placeholder="linkedin.com/in/…"
          className="flex h-11 w-full items-center rounded-lg border border-rule bg-surface px-3 text-[14.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>
      {state?.error && (
        <p className="text-[13px] text-closing">{state.error}</p>
      )}
      {state?.success && <p className="text-[13px] text-live">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center rounded-lg bg-navy font-body text-[14.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
