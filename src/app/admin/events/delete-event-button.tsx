"use client";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteEvent } from "./actions";

export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  return (
    <form action={deleteEvent.bind(null, eventId)}>
      <ConfirmSubmitButton
        confirmMessage={`Delete "${title}"? This cannot be undone.`}
        pendingLabel="Deleting…"
        className="font-medium text-closing underline underline-offset-2 disabled:opacity-60"
      >
        Delete
      </ConfirmSubmitButton>
    </form>
  );
}
