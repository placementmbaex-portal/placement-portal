"use client";

import { useActionState } from "react";
import { restoreCompany, restoreJob, restoreAnnouncement, type RestoreState } from "./actions";

const initialState: RestoreState = null;

export function RestoreButton({ kind, id }: { kind: "company" | "job" | "announcement"; id: string }) {
  const action =
    kind === "company" ? restoreCompany : kind === "job" ? restoreJob : restoreAnnouncement;
  const [state, formAction, pending] = useActionState(action.bind(null, id), initialState);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="text-navy underline underline-offset-2 disabled:text-shut disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? "Restoring…" : "Restore"}
      </button>
      {state?.error && <p className="text-[11.5px] text-closing">{state.error}</p>}
    </form>
  );
}
