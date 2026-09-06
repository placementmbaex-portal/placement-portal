"use client";

import { useActionState } from "react";
import type { CompanyFormState } from "./actions";

const initialState: CompanyFormState = null;

type CompanyDefaults = {
  name: string;
  sector: string | null;
  about: string | null;
  tags: string[];
  is_legacy_recruiter: boolean;
  logo_url: string | null;
};

export function CompanyForm({
  action,
  defaultValues,
}: {
  action: (
    prevState: CompanyFormState,
    formData: FormData,
  ) => Promise<CompanyFormState>;
  defaultValues?: CompanyDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="sector" className="block text-sm font-medium">
          Sector
        </label>
        <input
          id="sector"
          name="sector"
          defaultValue={defaultValues?.sector ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="about" className="block text-sm font-medium">
          About
        </label>
        <textarea
          id="about"
          name="about"
          rows={4}
          defaultValue={defaultValues?.about ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="tags" className="block text-sm font-medium">
          Tags (comma separated)
        </label>
        <input
          id="tags"
          name="tags"
          placeholder="e.g. Consulting, Analytics"
          defaultValue={defaultValues?.tags.join(", ") ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="logo_url" className="block text-sm font-medium">
          Logo URL
        </label>
        <input
          id="logo_url"
          name="logo_url"
          defaultValue={defaultValues?.logo_url ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_legacy_recruiter"
          defaultChecked={defaultValues?.is_legacy_recruiter ?? false}
        />
        Legacy recruiter
      </label>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
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
