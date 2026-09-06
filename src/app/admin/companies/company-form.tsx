"use client";

import { useActionState } from "react";
import { AdminFormCard } from "@/components/admin-form-card";
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

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

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
    <form action={formAction}>
      <AdminFormCard
        title={defaultValues ? "Edit company" : "Add a company"}
        cancelHref="/admin/companies"
        submitLabel="Save company"
        pending={pending}
        error={state?.error}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="sector" className={labelClass}>
              Sector
            </label>
            <input
              id="sector"
              name="sector"
              defaultValue={defaultValues?.sector ?? ""}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="about" className={labelClass}>
            About
          </label>
          <textarea
            id="about"
            name="about"
            rows={4}
            defaultValue={defaultValues?.about ?? ""}
            className="w-full rounded-md border border-rule px-3 py-2.5 text-[14px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>

        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags (comma separated)
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="e.g. Consulting, Analytics"
            defaultValue={defaultValues?.tags.join(", ") ?? ""}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="logo_url" className={labelClass}>
            Logo URL
          </label>
          <input
            id="logo_url"
            name="logo_url"
            placeholder="https://…"
            defaultValue={defaultValues?.logo_url ?? ""}
            className={fieldClass}
          />
          <p className="mt-1.5 text-[11.5px] text-shut">
            Falls back to two-letter initials when left blank.
          </p>
        </div>

        <label className="flex items-center gap-2.5 text-[14px] text-ink">
          <input
            type="checkbox"
            name="is_legacy_recruiter"
            defaultChecked={defaultValues?.is_legacy_recruiter ?? false}
            className="h-4 w-4"
          />
          Legacy recruiter
        </label>
      </AdminFormCard>
    </form>
  );
}
