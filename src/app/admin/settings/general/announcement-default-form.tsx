"use client";

import { useActionState } from "react";
import { updateAnnouncementDefault, type AnnouncementDefaultState } from "./actions";

const initialState: AnnouncementDefaultState = null;

export function AnnouncementDefaultForm({ announcementEmailDefault }: { announcementEmailDefault: boolean }) {
  const [state, formAction, pending] = useActionState(updateAnnouncementDefault, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-center gap-2.5 text-[14px] text-ink">
        <input
          type="checkbox"
          name="announcement_email_default"
          defaultChecked={announcementEmailDefault}
          className="h-4 w-4"
        />
        Notify students by email when an announcement is approved, by default
      </label>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="flex h-9 items-center rounded-md bg-navy px-4 font-body text-[13px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <p className="text-[13px] text-closing">{state.error}</p>}
      {state?.success && <p className="text-[13px] text-live">Saved.</p>}
    </form>
  );
}
