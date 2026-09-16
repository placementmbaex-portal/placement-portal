"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  deleteProfileField,
  reorderProfileFields,
  toggleProfileFieldFlag,
  type ToggleColumn,
} from "./actions";
import type { ProfileFieldRow } from "./page";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  longtext: "Long text",
  number: "Number",
  date: "Date",
  select: "Select",
  multiselect: "Multiselect",
  boolean: "Yes / no",
  email: "Email",
  phone: "Phone",
  url: "URL",
};

function deleteWarning(field: ProfileFieldRow) {
  return `Delete “${field.label}”? Existing student answers stay stored under students.profile and will reappear if you recreate a field with the key “${field.field_key}”.`;
}

function FlagToggle({
  fieldKey,
  column,
  value,
  ariaLabel,
  visibleLabel,
}: {
  fieldKey: string;
  column: ToggleColumn;
  value: boolean;
  ariaLabel: string;
  visibleLabel?: string;
}) {
  const [checked, setChecked] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setChecked(value);
  }

  return (
    <label className="flex h-11 items-center justify-center gap-1.5 sm:h-auto">
      <input
        type="checkbox"
        checked={checked}
        aria-label={visibleLabel ? undefined : ariaLabel}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          void toggleProfileFieldFlag(fieldKey, column, next).then((result) => {
            if (result?.error) setChecked(!next);
          });
        }}
        className="h-4 w-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      {visibleLabel && <span className="text-[12.5px] text-ink">{visibleLabel}</span>}
    </label>
  );
}

function SectionGroup({ section, fields }: { section: string; fields: ProfileFieldRow[] }) {
  const [order, setOrder] = useState(fields);
  const [prevFields, setPrevFields] = useState(fields);
  const [dragKey, setDragKey] = useState<string | null>(null);

  if (fields !== prevFields) {
    setPrevFields(fields);
    setOrder(fields);
  }

  function commit(nextOrder: ProfileFieldRow[]) {
    setOrder(nextOrder);
    void reorderProfileFields(nextOrder.map((f) => f.field_key));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    const next = [...order];
    const fromIndex = next.findIndex((f) => f.field_key === dragKey);
    const toIndex = next.findIndex((f) => f.field_key === targetKey);
    setDragKey(null);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commit(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">{section}</h2>

      <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b border-rule bg-paper text-slate">
            <tr>
              <th className="h-10 w-8 px-2" />
              <th className="h-10 px-3 font-medium">Label</th>
              <th className="h-10 px-3 font-medium">Field key</th>
              <th className="h-10 px-3 font-medium">Type</th>
              <th className="h-10 px-3 text-center font-medium">Visible</th>
              <th className="h-10 px-3 text-center font-medium">Editable</th>
              <th className="h-10 px-3 text-center font-medium">In export</th>
              <th className="h-10 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {order.map((field, index) => (
              <tr
                key={field.field_key}
                draggable
                onDragStart={() => setDragKey(field.field_key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(field.field_key)}
                className={`h-11 border-b border-rule last:border-0 ${
                  dragKey === field.field_key ? "opacity-50" : ""
                }`}
              >
                <td className="px-2">
                  <span aria-hidden="true" className="cursor-grab text-[15px] text-shut select-none">
                    ⠿
                  </span>
                </td>
                <td className="px-3 font-medium text-ink">
                  {field.label}
                  {field.required && <span className="ml-1 text-closing">*</span>}
                </td>
                <td className="px-3 font-mono text-[12.5px] text-slate">{field.field_key}</td>
                <td className="px-3 text-slate">
                  {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                </td>
                <td className="px-3 text-center">
                  <FlagToggle
                    fieldKey={field.field_key}
                    column="student_visible"
                    value={field.student_visible}
                    ariaLabel={`Visible to students: ${field.label}`}
                  />
                </td>
                <td className="px-3 text-center">
                  <FlagToggle
                    fieldKey={field.field_key}
                    column="student_editable"
                    value={field.student_editable}
                    ariaLabel={`Editable by students: ${field.label}`}
                  />
                </td>
                <td className="px-3 text-center">
                  <FlagToggle
                    fieldKey={field.field_key}
                    column="include_in_export"
                    value={field.include_in_export}
                    ariaLabel={`Included in export: ${field.label}`}
                  />
                </td>
                <td className="px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move up: ${field.label}`}
                      className="flex h-8 w-8 items-center justify-center text-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === order.length - 1}
                      aria-label={`Move down: ${field.label}`}
                      className="flex h-8 w-8 items-center justify-center text-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      ↓
                    </button>
                    <Link
                      href={`/admin/profile-fields/${field.field_key}/edit`}
                      className="ml-1.5 text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      Edit
                    </Link>
                    <form action={deleteProfileField.bind(null, field.field_key)} className="ml-3">
                      <ConfirmSubmitButton
                        confirmMessage={deleteWarning(field)}
                        pendingLabel="…"
                        className="text-closing underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 sm:hidden">
        {order.map((field, index) => (
          <div key={field.field_key} className="rounded-[14px] border border-rule bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold text-ink">
                  {field.label}
                  {field.required && <span className="ml-1 text-closing">*</span>}
                </p>
                <p className="mt-0.5 font-mono text-[12px] text-slate">{field.field_key}</p>
              </div>
              <span className="shrink-0 text-[12px] text-slate">
                {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              <FlagToggle
                fieldKey={field.field_key}
                column="student_visible"
                value={field.student_visible}
                ariaLabel={`Visible to students: ${field.label}`}
                visibleLabel="Visible"
              />
              <FlagToggle
                fieldKey={field.field_key}
                column="student_editable"
                value={field.student_editable}
                ariaLabel={`Editable by students: ${field.label}`}
                visibleLabel="Editable"
              />
              <FlagToggle
                fieldKey={field.field_key}
                column="include_in_export"
                value={field.include_in_export}
                ariaLabel={`Included in export: ${field.label}`}
                visibleLabel="In export"
              />
            </div>

            <div className="mt-2.5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move up: ${field.label}`}
                className="flex h-11 items-center text-[13px] font-medium text-ink disabled:opacity-30"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move down: ${field.label}`}
                className="flex h-11 items-center text-[13px] font-medium text-ink disabled:opacity-30"
              >
                Move down
              </button>
              <Link
                href={`/admin/profile-fields/${field.field_key}/edit`}
                className="flex h-11 items-center text-[13px] font-medium text-navy"
              >
                Edit
              </Link>
              <form action={deleteProfileField.bind(null, field.field_key)}>
                <ConfirmSubmitButton
                  confirmMessage={deleteWarning(field)}
                  pendingLabel="…"
                  className="flex h-11 items-center text-[13px] font-medium text-closing underline underline-offset-2"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldsTable({ sections }: { sections: [string, ProfileFieldRow[]][] }) {
  return (
    <div className="flex flex-col gap-6">
      {sections.map(([section, fields]) => (
        <SectionGroup key={section} section={section} fields={fields} />
      ))}
    </div>
  );
}
