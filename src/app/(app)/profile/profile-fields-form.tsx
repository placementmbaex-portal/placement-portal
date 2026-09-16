"use client";

import { useActionState } from "react";
import { updateProfileFields, type ProfileFieldsFormState } from "./actions";

const initialState: ProfileFieldsFormState = null;

export type VisibleProfileField = {
  field_key: string;
  label: string;
  field_type: string;
  options: string[] | null;
  section: string;
  display_order: number;
  student_editable: boolean;
  required: boolean;
  help_text: string | null;
};

const fieldClass =
  "flex h-11 w-full items-center rounded-lg border border-rule bg-surface px-3 text-[14.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-[5px] block text-[12px] text-slate";

function displayValue(field: VisibleProfileField, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field.field_type === "boolean") return value === true ? "Yes" : "No";
  if (field.field_type === "multiselect") {
    return Array.isArray(value) && value.length > 0 ? (value as string[]).join(", ") : "—";
  }
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  return "—";
}

function ScalarInput({ field, value }: { field: VisibleProfileField; value: unknown }) {
  const stringValue =
    typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

  switch (field.field_type) {
    case "longtext":
      return (
        <textarea
          id={field.field_key}
          name={field.field_key}
          rows={3}
          defaultValue={stringValue}
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2.5 text-[14.5px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
      );
    case "number":
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="number"
          step="any"
          defaultValue={stringValue}
          className={`${fieldClass} tabular-nums`}
        />
      );
    case "date":
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="date"
          defaultValue={stringValue}
          className={`${fieldClass} tabular-nums`}
        />
      );
    case "select":
      return (
        <select
          id={field.field_key}
          name={field.field_key}
          defaultValue={stringValue}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "email":
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="email"
          defaultValue={stringValue}
          className={fieldClass}
        />
      );
    case "phone":
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="tel"
          defaultValue={stringValue}
          className={fieldClass}
        />
      );
    case "url":
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="url"
          defaultValue={stringValue}
          className={fieldClass}
        />
      );
    default:
      return (
        <input
          id={field.field_key}
          name={field.field_key}
          type="text"
          defaultValue={stringValue}
          className={fieldClass}
        />
      );
  }
}

function EditableFieldBlock({ field, value }: { field: VisibleProfileField; value: unknown }) {
  if (field.field_type === "boolean") {
    return (
      <div className="px-3.5 py-3">
        <label className="flex h-11 items-center gap-2.5 text-[14px] text-ink">
          <input
            type="checkbox"
            name={field.field_key}
            defaultChecked={value === true}
            className="h-4 w-4"
          />
          {field.label}
          {field.required && <span className="text-closing"> *</span>}
        </label>
        {field.help_text && (
          <p className="mt-1.25 pl-[26px] text-[11px] text-shut">{field.help_text}</p>
        )}
      </div>
    );
  }

  if (field.field_type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="px-3.5 py-3">
        <legend className={labelClass}>
          {field.label}
          {field.required && <span className="text-closing"> *</span>}
        </legend>
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((option) => (
            <label key={option} className="flex items-center gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                name={field.field_key}
                value={option}
                defaultChecked={selected.includes(option)}
                className="h-4 w-4"
              />
              {option}
            </label>
          ))}
        </div>
        {field.help_text && <p className="mt-1.25 text-[11px] text-shut">{field.help_text}</p>}
      </fieldset>
    );
  }

  return (
    <div className="px-3.5 py-3">
      <label htmlFor={field.field_key} className={labelClass}>
        {field.label}
        {field.required && <span className="text-closing"> *</span>}
      </label>
      <ScalarInput field={field} value={value} />
      {field.help_text && <p className="mt-1.25 text-[11px] text-shut">{field.help_text}</p>}
    </div>
  );
}

export function ProfileFieldsForm({
  sections,
  values,
}: {
  sections: [string, VisibleProfileField[]][];
  values: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(updateProfileFields, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {sections.map(([section, fields]) => (
        <div key={section}>
          <p className="mb-2 font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {section}
          </p>
          <div className="overflow-hidden rounded-xl border border-rule bg-surface">
            {fields.map((field, i) => (
              <div key={field.field_key}>
                {field.student_editable ? (
                  <EditableFieldBlock field={field} value={values[field.field_key]} />
                ) : (
                  <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <div>
                      <p className="text-[13px] text-slate">
                        {field.label}
                        {field.required && <span className="text-closing"> *</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] text-shut">
                        Maintained by the placement committee
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-[13px] font-medium text-ink">
                      {displayValue(field, values[field.field_key])}
                    </p>
                  </div>
                )}
                {i < fields.length - 1 && <div className="h-px bg-rule" />}
              </div>
            ))}
          </div>
        </div>
      ))}

      {state?.error && <p className="text-[13px] text-closing">{state.error}</p>}
      {state?.success && <p className="text-[13px] text-live">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center rounded-lg bg-navy font-body text-[14.5px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
