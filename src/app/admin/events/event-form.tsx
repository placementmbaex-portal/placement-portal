"use client";

import { useActionState } from "react";
import { createEvent, type EventFormState } from "./actions";

const initialState: EventFormState = null;

const EVENT_TYPE_OPTIONS = [
  { value: "ppt", label: "PPT" },
  { value: "test", label: "Written test" },
  { value: "interview", label: "Interview day" },
  { value: "other", label: "Other" },
];

export function EventForm({
  companies,
  jobs,
}: {
  companies: { id: string; name: string }[];
  jobs: { id: string; title: string; companyName: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createEvent,
    initialState,
  );

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
        <label htmlFor="type" className="block text-[13.5px] text-slate">
          Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          <option value="" disabled>
            Choose…
          </option>
          {EVENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="block text-[13.5px] text-slate">
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
          Related role (required to restrict to shortlisted students)
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="starts_at" className="block text-[13.5px] text-slate">
            Starts (IST)
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ends_at" className="block text-[13.5px] text-slate">
            Ends (IST)
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            required
            className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="venue" className="block text-[13.5px] text-slate">
          Venue
        </label>
        <input
          id="venue"
          name="venue"
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="link" className="block text-[13.5px] text-slate">
          Joining link
        </label>
        <input
          id="link"
          name="link"
          type="text"
          placeholder="Provide this or a venue"
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="visibility" className="block text-[13.5px] text-slate">
          Visible to
        </label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="all"
          className="h-10 w-full rounded-md border border-rule px-3 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        >
          <option value="all">Everyone</option>
          <option value="shortlisted">
            Only students shortlisted for the related role
          </option>
        </select>
      </div>

      {state?.error && (
        <p className="text-[13.5px] text-closing">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? "Saving…" : "Add event"}
      </button>
    </form>
  );
}
