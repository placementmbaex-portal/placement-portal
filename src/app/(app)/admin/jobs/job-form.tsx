"use client";

import { useActionState } from "react";
import { utcIsoToIstDatetimeLocal } from "@/lib/format";
import type { JobFormState } from "./actions";

const initialState: JobFormState = null;

type JobDefaults = {
  company_id: string;
  title: string;
  description: string | null;
  location: string | null;
  deadline: string | null;
  min_experience_years: number | null;
  is_open: boolean;
  jd_path: string | null;
};

export function JobForm({
  action,
  companies,
  defaultValues,
}: {
  action: (
    prevState: JobFormState,
    formData: FormData,
  ) => Promise<JobFormState>;
  companies: { id: string; name: string }[];
  defaultValues?: JobDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label htmlFor="company_id" className="block text-sm font-medium">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          defaultValue={defaultValues?.company_id ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Choose a company
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={defaultValues?.description ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          defaultValue={defaultValues?.location ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="deadline" className="block text-sm font-medium">
          Deadline (IST)
        </label>
        <input
          id="deadline"
          name="deadline"
          type="datetime-local"
          defaultValue={
            defaultValues?.deadline
              ? utcIsoToIstDatetimeLocal(defaultValues.deadline)
              : ""
          }
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="min_experience_years"
          className="block text-sm font-medium"
        >
          Minimum experience (years)
        </label>
        <input
          id="min_experience_years"
          name="min_experience_years"
          type="number"
          min="0"
          step="0.5"
          defaultValue={defaultValues?.min_experience_years ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="jd_file" className="block text-sm font-medium">
          JD PDF {defaultValues?.jd_path ? "(uploading replaces it)" : ""}{" "}
          (max 2MB)
        </label>
        <input
          id="jd_file"
          name="jd_file"
          type="file"
          accept="application/pdf"
          className="block w-full text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_open"
          defaultChecked={defaultValues?.is_open ?? false}
        />
        Open for applications
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
