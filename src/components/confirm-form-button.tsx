"use client";

import type { ReactNode } from "react";

// For a button/select pair whose <form> lives elsewhere in the DOM,
// referenced via the HTML `form` attribute rather than nesting — needed
// wherever the surrounding markup already has its own per-row <form>s (so
// a single wrapping <form> would nest forms, which HTML forbids).
// useFormStatus only sees descendants of its form, so ConfirmSubmitButton
// doesn't work here; this trades the pending-state readout for a plain
// confirm-before-submit.
export function ConfirmFormButton({
  formId,
  confirmMessage,
  disabled = false,
  children,
  className,
}: {
  formId: string;
  confirmMessage: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      form={formId}
      disabled={disabled}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
