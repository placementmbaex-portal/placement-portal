"use client";

import { useActionState, useState } from "react";
import { fillWhatsAppTemplate, WHATSAPP_MESSAGE_SOFT_LIMIT } from "@/lib/whatsapp";
import { updateWhatsAppTemplate, type WhatsAppTemplateState } from "./actions";

const SAMPLE = {
  company: "Acme Consulting",
  title: "Senior Associate",
  location: "Mumbai",
  deadlineIso: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  link: "https://placement-portal-theta-rosy.vercel.app/jobs/sample",
  excerptSource:
    "We're excited to share a new opportunity with Acme Consulting for the role of Senior Associate. This is a great chance to work on high-impact projects across multiple sectors, with strong growth potential for the right candidate.",
  appliedCount: 12,
  totalStudents: 74,
};

const initialState: WhatsAppTemplateState = null;

export function WhatsAppTemplateEditor({
  templateKey,
  label,
  helpText,
  defaultValue,
}: {
  templateKey: "whatsapp_template_job" | "whatsapp_template_announcement" | "whatsapp_template_reminder";
  label: string;
  helpText: string;
  defaultValue: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateWhatsAppTemplate.bind(null, templateKey),
    initialState,
  );
  const [text, setText] = useState(defaultValue);
  const preview = fillWhatsAppTemplate(text, SAMPLE);
  const overLimit = preview.length > WHATSAPP_MESSAGE_SOFT_LIMIT;

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-slate">{helpText}</p>
      </div>
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${templateKey}_input`} className="mb-1.5 block text-[12.5px] text-slate">
            Template
          </label>
          <textarea
            id={`${templateKey}_input`}
            name="template"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-rule px-3 py-2 font-mono text-[12.5px] leading-[1.5] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12.5px] text-slate">Preview (sample data)</span>
            <span className={`text-[11px] tabular-nums ${overLimit ? "text-closing" : "text-shut"}`}>
              {preview.length} / {WHATSAPP_MESSAGE_SOFT_LIMIT}
            </span>
          </div>
          <pre className="h-[calc(100%-22px)] min-h-[132px] overflow-y-auto rounded-md border border-rule bg-paper p-3 font-mono text-[12.5px] leading-[1.5] whitespace-pre-wrap text-ink">
            {preview}
          </pre>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="flex h-9 items-center rounded-md bg-navy px-4 font-body text-[13px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {state?.error && <p className="text-[13px] text-closing">{state.error}</p>}
          {state?.success && !state.warning && <p className="text-[13px] text-live">Saved.</p>}
          {state?.success && state.warning && (
            <p className="text-[13px] text-closing">Saved — {state.warning}</p>
          )}
        </div>
      </form>
    </div>
  );
}
