"use client";

import { useActionState, useState } from "react";
import { AdminFormCard } from "@/components/admin-form-card";
import { utcIsoToIstDatetimeLocal } from "@/lib/format";
import { getShortlistedCount, type EventFormState } from "./actions";

const initialState: EventFormState = null;

const EVENT_TYPE_OPTIONS = [
  { value: "ppt", label: "PPT" },
  { value: "test", label: "Written test" },
  { value: "interview", label: "Interview day" },
  { value: "other", label: "Other" },
];

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

type EventDefaults = {
  title: string;
  type: string;
  company_id: string | null;
  job_id: string | null;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  link: string | null;
  visibility: string;
};

export function EventForm({
  action,
  companies,
  jobs,
  defaultValues,
  initialShortlistedCount,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData,
  ) => Promise<EventFormState>;
  companies: { id: string; name: string }[];
  jobs: { id: string; title: string; companyName: string }[];
  defaultValues?: EventDefaults;
  // Rendered server-side by the edit page so an already-restricted event
  // shows its real count immediately, with no "Counting…" flash on load --
  // the client-side refresh below only kicks in once something changes.
  initialShortlistedCount?: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isEditing = !!defaultValues;

  const [jobId, setJobId] = useState(defaultValues?.job_id ?? "");
  const [visibility, setVisibility] = useState(defaultValues?.visibility ?? "all");
  const [shortlistedCount, setShortlistedCount] = useState<number | null>(
    initialShortlistedCount ?? null,
  );

  function refreshCount(nextJobId: string, nextVisibility: string) {
    if (nextVisibility !== "shortlisted" || !nextJobId) {
      setShortlistedCount(null);
      return;
    }
    void getShortlistedCount(nextJobId).then(setShortlistedCount);
  }

  return (
    <form action={formAction}>
      <AdminFormCard
        title={isEditing ? "Edit event" : "Add an event"}
        cancelHref="/admin/events"
        submitLabel={isEditing ? "Save changes" : "Save event"}
        pending={pending}
        error={state?.error}
      >
        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={defaultValues?.title}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="type" className={labelClass}>
            Type
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={defaultValues?.type ?? ""}
            className={fieldClass}
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

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="company_id" className={labelClass}>
              Related company (optional)
            </label>
            <select
              id="company_id"
              name="company_id"
              defaultValue={defaultValues?.company_id ?? ""}
              className={fieldClass}
            >
              <option value="">None</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="job_id" className={labelClass}>
              Related role
            </label>
            <select
              id="job_id"
              name="job_id"
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                refreshCount(e.target.value, visibility);
              }}
              className={fieldClass}
            >
              <option value="">None</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.companyName} — {job.title}
                </option>
              ))}
            </select>
            <p className="mt-1.25 text-[11.5px] text-shut">Required to restrict to shortlisted students.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="starts_at" className={labelClass}>
              Starts (IST)
            </label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={
                defaultValues ? utcIsoToIstDatetimeLocal(defaultValues.starts_at) : undefined
              }
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="ends_at" className={labelClass}>
              Ends (IST)
            </label>
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              required
              defaultValue={
                defaultValues ? utcIsoToIstDatetimeLocal(defaultValues.ends_at) : undefined
              }
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="venue" className={labelClass}>
            Venue
          </label>
          <input id="venue" name="venue" defaultValue={defaultValues?.venue ?? ""} className={fieldClass} />
        </div>

        <div>
          <label htmlFor="link" className={labelClass}>
            Joining link
          </label>
          <input
            id="link"
            name="link"
            type="text"
            placeholder="Provide this or a venue"
            defaultValue={defaultValues?.link ?? ""}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="visibility" className={labelClass}>
            Visible to
          </label>
          <select
            id="visibility"
            name="visibility"
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value);
              refreshCount(jobId, e.target.value);
            }}
            className={fieldClass}
          >
            <option value="all">Everyone</option>
            <option value="shortlisted">Only students shortlisted for the related role</option>
          </select>
          {visibility === "shortlisted" && (
            <p className="mt-1.5 text-[13px] font-medium text-ink">
              {!jobId
                ? "Choose a role above to see who this reaches."
                : shortlistedCount === null
                  ? "Counting…"
                  : `${shortlistedCount} student${shortlistedCount === 1 ? "" : "s"} will see this.`}
            </p>
          )}
        </div>
      </AdminFormCard>
    </form>
  );
}
