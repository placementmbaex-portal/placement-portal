"use client";

import { useActionState } from "react";
import { utcIsoToIstDatetimeLocal, getDeadlineUrgency } from "@/lib/format";
import { AdminFormCard } from "@/components/admin-form-card";
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

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

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

  const isClosingSoon =
    !!defaultValues?.deadline && getDeadlineUrgency(defaultValues.deadline) === "urgent";

  return (
    <form action={formAction}>
      <AdminFormCard
        title={defaultValues ? "Edit role" : "Create a role"}
        subtitle="Students see it the moment you tick “open for applications”."
        cancelHref="/admin/jobs"
        submitLabel={defaultValues ? "Save changes" : "Save and publish"}
        pending={pending}
        error={state?.error}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="company_id" className={labelClass}>
              Company
            </label>
            <select
              id="company_id"
              name="company_id"
              required
              defaultValue={defaultValues?.company_id ?? ""}
              className={fieldClass}
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
          <div>
            <label htmlFor="title" className={labelClass}>
              Role title
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={defaultValues?.title}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="What the role is, who it suits, and what the process looks like."
            defaultValue={defaultValues?.description ?? ""}
            className="w-full rounded-md border border-rule px-3 py-2.5 text-[14px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <label htmlFor="location" className={labelClass}>
              Location
            </label>
            <input
              id="location"
              name="location"
              defaultValue={defaultValues?.location ?? ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="deadline" className={labelClass}>
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
              className={`${fieldClass} tabular-nums ${isClosingSoon ? "border-[1.5px] border-closing" : ""}`}
            />
            {isClosingSoon && (
              <p className="mt-1.25 text-[11.5px] text-closing">
                Under 48 hours away — students get the closing-soon flag immediately.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="min_experience_years" className={labelClass}>
              Min. experience
            </label>
            <input
              id="min_experience_years"
              name="min_experience_years"
              type="number"
              min="0"
              step="0.5"
              defaultValue={defaultValues?.min_experience_years ?? ""}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="jd_file" className={labelClass}>
            Job description PDF (max 2 MB)
            {defaultValues?.jd_path ? " — uploading replaces the existing file" : ""}
          </label>
          <input
            id="jd_file"
            name="jd_file"
            type="file"
            accept="application/pdf"
            className="block w-full text-[14px] text-ink"
          />
        </div>

        <label className="flex items-center gap-2.5 text-[14px] text-ink">
          <input
            type="checkbox"
            name="is_open"
            defaultChecked={defaultValues?.is_open ?? false}
            className="h-4 w-4"
          />
          Open for applications
        </label>
      </AdminFormCard>
    </form>
  );
}
