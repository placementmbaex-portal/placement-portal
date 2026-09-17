"use client";

import { useActionState, useState } from "react";
import { AdminFormCard } from "@/components/admin-form-card";
import type { ProfileFieldFormState } from "./actions";

const initialState: ProfileFieldFormState = null;

const FIELD_TYPES: { value: string; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "longtext", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select (one of several)" },
  { value: "multiselect", label: "Multiselect (any of several)" },
  { value: "boolean", label: "Yes / no" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
];

type FieldDefaults = {
  field_key: string;
  label: string;
  field_type: string;
  options: string[] | null;
  section: string;
  display_order: number;
  required: boolean;
  help_text: string | null;
};

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

export function FieldForm({
  action,
  existingSections,
  defaultValues,
}: {
  action: (
    prevState: ProfileFieldFormState,
    formData: FormData,
  ) => Promise<ProfileFieldFormState>;
  existingSections: string[];
  defaultValues?: FieldDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fieldType, setFieldType] = useState(defaultValues?.field_type ?? "text");
  const [options, setOptions] = useState<string[]>(
    defaultValues?.options && defaultValues.options.length > 0
      ? defaultValues.options
      : [""],
  );
  const isEditing = !!defaultValues;
  const needsOptions = fieldType === "select" || fieldType === "multiselect";

  return (
    <form action={formAction}>
      <AdminFormCard
        title={isEditing ? "Edit profile field" : "Add a profile field"}
        subtitle="Values students have already saved for other fields are untouched."
        cancelHref="/admin/settings/profile-fields"
        submitLabel={isEditing ? "Save changes" : "Add field"}
        pending={pending}
        error={state?.error}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="label" className={labelClass}>
              Label
            </label>
            <input
              id="label"
              name="label"
              required
              defaultValue={defaultValues?.label}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="field_key" className={labelClass}>
              Field key
            </label>
            {isEditing ? (
              <input
                id="field_key"
                value={defaultValues!.field_key}
                disabled
                className={`${fieldClass} bg-paper font-mono text-[13px] text-slate`}
              />
            ) : (
              <>
                <input
                  id="field_key"
                  name="field_key"
                  required
                  pattern="[a-z][a-z0-9_]*"
                  placeholder="e.g. notice_period_days"
                  className={`${fieldClass} font-mono text-[13px]`}
                />
                <p className="mt-1.25 text-[11.5px] text-shut">
                  Lowercase letters, numbers and underscores. Cannot be changed later.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="field_type" className={labelClass}>
              Field type
            </label>
            <select
              id="field_type"
              name="field_type"
              required
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className={fieldClass}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="section" className={labelClass}>
              Section
            </label>
            <input
              id="section"
              name="section"
              required
              list="section-suggestions"
              defaultValue={defaultValues?.section ?? ""}
              className={fieldClass}
            />
            <datalist id="section-suggestions">
              {existingSections.map((section) => (
                <option key={section} value={section} />
              ))}
            </datalist>
          </div>
        </div>

        {needsOptions && (
          <fieldset>
            <legend className={labelClass}>Options</legend>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    name="option"
                    aria-label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, i) => i !== index))}
                    disabled={options.length === 1}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center text-[18px] text-closing disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="mt-2.5 flex h-9 items-center rounded-md border border-navy px-3 font-body text-[13px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Add option
            </button>
          </fieldset>
        )}

        <div>
          <label htmlFor="display_order" className={labelClass}>
            Display order
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={defaultValues?.display_order ?? 100}
            className={`${fieldClass} tabular-nums sm:w-[140px]`}
          />
        </div>

        <label className="flex items-center gap-2.5 text-[14px] text-ink">
          <input
            type="checkbox"
            name="required"
            defaultChecked={defaultValues?.required ?? false}
            className="h-4 w-4"
          />
          Required
        </label>

        <div>
          <label htmlFor="help_text" className={labelClass}>
            Help text (optional)
          </label>
          <textarea
            id="help_text"
            name="help_text"
            rows={2}
            defaultValue={defaultValues?.help_text ?? ""}
            className="w-full rounded-md border border-rule px-3 py-2.5 text-[14px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          />
        </div>
      </AdminFormCard>
    </form>
  );
}
