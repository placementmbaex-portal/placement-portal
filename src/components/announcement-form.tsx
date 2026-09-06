"use client";

import { useActionState } from "react";
import type { AnnouncementFormState } from "@/lib/announcements/actions";
import { CATEGORY_CHIPS } from "@/lib/chips";

const initialState: AnnouncementFormState = null;

export function AnnouncementForm({
  action,
  companies,
  jobs,
  showPublishToggle = false,
}: {
  action: (
    prevState: AnnouncementFormState,
    formData: FormData,
  ) => Promise<AnnouncementFormState>;
  companies: { id: string; name: string }[];
  jobs: { id: string; title: string; companyName: string }[];
  showPublishToggle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="block text-[13.5px] text-slate">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="body" className="block text-[13.5px] text-slate">
          Body
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          className="w-full rounded-md border border-rule px-3 py-2 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="category" className="block text-[13.5px] text-slate">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue="general"
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          {Object.entries(CATEGORY_CHIPS).map(([value, chip]) => (
            <option key={value} value={value}>
              {chip.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="company_id"
          className="block text-[13.5px] text-slate"
        >
          Related company (optional)
        </label>
        <select
          id="company_id"
          name="company_id"
          defaultValue=""
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          <option value="">None</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="job_id" className="block text-[13.5px] text-slate">
          Related role (optional)
        </label>
        <select
          id="job_id"
          name="job_id"
          defaultValue=""
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          <option value="">None</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.companyName} — {job.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="attachment"
          className="block text-[13.5px] text-slate"
        >
          Attachment PDF (optional, max 2MB)
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept="application/pdf"
          className="block w-full text-[15px] text-ink"
        />
      </div>

      {showPublishToggle && (
        <label className="flex items-center gap-2 text-[15px] text-ink">
          <input type="checkbox" name="publish_immediately" defaultChecked />
          Publish immediately
        </label>
      )}

      {state?.error && (
        <p className="text-[13.5px] text-closing">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending
          ? "Saving…"
          : showPublishToggle
            ? "Post announcement"
            : "Submit for review"}
      </button>
    </form>
  );
}
