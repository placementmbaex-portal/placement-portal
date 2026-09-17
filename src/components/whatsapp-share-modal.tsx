"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsAppShare } from "@/components/whatsapp-share";

// Same <dialog> convention as DeleteCompanyModal: the dialog's own
// ESC/backdrop dismissal changes its DOM open state outside React, so
// `open` only ever drives showModal()/close() here, never the reverse.
export function WhatsAppShareModal({
  title,
  message,
  onShare,
  triggerLabel = "Share",
  triggerClassName,
}: {
  title: string;
  message: string;
  onShare?: () => void | Promise<void>;
  triggerLabel?: string;
  triggerClassName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="w-full max-w-[520px] rounded-lg border border-rule bg-surface p-0 shadow-[0_1px_3px_rgba(22,32,46,0.08)] backdrop:bg-ink/42"
      >
        <div className="px-6 py-5.5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[18px] text-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              &times;
            </button>
          </div>
          <div className="mt-3.5">
            <WhatsAppShare message={message} onShare={onShare} />
          </div>
        </div>
      </dialog>
    </>
  );
}
