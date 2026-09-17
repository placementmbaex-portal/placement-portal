"use client";

import { useState } from "react";
import { WHATSAPP_MESSAGE_SOFT_LIMIT } from "@/lib/whatsapp";

// The one place "copy or open counts as shared" is wired up -- both
// handlers call onShare, and callers decide what that means (stamp one
// job, stamp several for a digest, or nothing at all for a Settings
// preview built from sample data).
export function WhatsAppShare({
  message,
  onShare,
}: {
  message: string;
  onShare?: () => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const overLimit = message.length > WHATSAPP_MESSAGE_SOFT_LIMIT;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("WhatsAppShare: clipboard write failed", err);
    }
    void onShare?.();
  }

  function handleOpen() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    void onShare?.();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <pre className="max-h-64 overflow-y-auto rounded-md border border-rule bg-paper p-3 font-mono text-[12.5px] leading-[1.5] whitespace-pre-wrap text-ink">
        {message}
      </pre>
      <p className={`text-[11.5px] tabular-nums ${overLimit ? "text-closing" : "text-shut"}`}>
        {message.length} / {WHATSAPP_MESSAGE_SOFT_LIMIT} characters
        {overLimit ? " — WhatsApp truncates this behind “Read more” and hides the link" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-10 items-center rounded-md border border-navy px-3.5 font-body text-[13.5px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {copied ? "Copied" : "Copy message"}
        </button>
        <button
          type="button"
          onClick={handleOpen}
          className="flex h-10 items-center rounded-md bg-navy px-3.5 font-body text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Open in WhatsApp
        </button>
      </div>
    </div>
  );
}
