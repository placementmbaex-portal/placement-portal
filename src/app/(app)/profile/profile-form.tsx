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
    <form
      action={action}
      className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium text-zinc-500">Contact details</h2>
      <div className="space-y-1">
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="linkedin" className="block text-sm font-medium">
          LinkedIn
        </label>
        <input
          id="linkedin"
          name="linkedin"
          type="text"
          defaultValue={linkedin ?? ""}
          placeholder="https://linkedin.com/in/..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
