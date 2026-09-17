"use client";

import { useActionState, useRef, useState } from "react";
import {
  permanentlyDeleteCompany,
  permanentlyDeleteJob,
  permanentlyDeleteAnnouncement,
  type PermanentDeleteState,
} from "./actions";

const initialState: PermanentDeleteState = null;

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function destroysMessage(
  kind: "company" | "job" | "announcement",
  impact: { applications?: number; jobs?: number; comments?: number },
) {
  if (kind === "announcement") {
    const comments = impact.comments ?? 0;
    return comments > 0
      ? `This destroys the announcement and its ${plural(comments, "comment")}.`
      : "This destroys the announcement. It has no comments on record.";
  }
  if (kind === "company") {
    const jobs = impact.jobs ?? 0;
    const applications = impact.applications ?? 0;
    if (jobs === 0) return "This destroys the company. It has no jobs on record.";
    return applications > 0
      ? `This destroys the company, its ${plural(jobs, "job")} and ${plural(applications, "application")} against them.`
      : `This destroys the company and its ${plural(jobs, "job")}.`;
  }
  const applications = impact.applications ?? 0;
  return applications > 0
    ? `This destroys the role and ${plural(applications, "application")} against it.`
    : "This destroys the role. It has no applications on record.";
}

export function PermanentDeleteModal({
  kind,
  id,
  name,
  impact = {},
}: {
  kind: "company" | "job" | "announcement";
  id: string;
  name: string;
  impact?: { applications?: number; jobs?: number; comments?: number };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typedName, setTypedName] = useState("");

  const action =
    kind === "announcement"
      ? permanentlyDeleteAnnouncement
      : kind === "company"
        ? permanentlyDeleteCompany
        : permanentlyDeleteJob;
  const [state, formAction, pending] = useActionState(action.bind(null, id), initialState);

  // Announcements have no retype gate -- permanently_delete_announcement()
  // takes no confirmation text, unlike the company/job RPCs. The modal
  // itself, opened deliberately and separate from the soft-delete confirm,
  // is the confirmation.
  const requiresTypedConfirm = kind !== "announcement";
  const canDelete = !requiresTypedConfirm || typedName === name;
  const inputId = `permanent_confirm_${id}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-closing underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Permanently delete
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-[520px] rounded-lg border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/42"
      >
        <div className="px-6 pt-5.5">
          <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
            Permanently delete {name}?
          </h2>
          <p className="mt-2.5 text-[14px] leading-[1.6] text-ink">
            {destroysMessage(kind, impact)} This cannot be undone.
          </p>

          <form action={formAction} className="mt-4.5">
            {requiresTypedConfirm && (
              <>
                <label htmlFor={inputId} className="mb-1.5 block text-[13px] text-slate">
                  Type <span className="font-mono text-[13px] font-semibold text-ink">{name}</span> to confirm
                </label>
                <input
                  id={inputId}
                  name={kind === "company" ? "confirm_name" : "confirm_title"}
                  autoComplete="off"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={kind === "company" ? "Company name" : "Role title"}
                  className="h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                />
              </>
            )}
            {state?.error && <p className="mt-2 text-[13.5px] text-closing">{state.error}</p>}
            <div className="mt-5 flex items-center justify-end gap-4.5 border-t border-rule py-4.5">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canDelete || pending}
                className="flex h-11 items-center rounded-md bg-closing px-4.5 font-body text-[14px] font-semibold text-white disabled:bg-[#ECEFF3] disabled:text-shut sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {pending ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
