"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  commitImport,
  parseSpreadsheet,
  previewImport,
  type CommitResult,
  type ImportPlan,
} from "./actions";
import {
  CORE_FIELDS,
  autoMapColumns,
  validateMapping,
  type ColumnMapping,
  type ParsedSheet,
  type ProfileFieldMeta,
} from "./shared";

const STEP_LABELS = ["Upload", "Map columns", "Preview", "Confirm"];

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";

function StepEyebrow({ step }: { step: number }) {
  return (
    <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
      Step {step} of 4 · {STEP_LABELS[step - 1]}
    </p>
  );
}

export function ImportWizard({ profileFields }: { profileFields: ProfileFieldMeta[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, startParsing] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreviewing] = useTransition();

  const [result, setResult] = useState<CommitResult>(null);
  const [committing, startCommitting] = useTransition();

  const sectionedFields = useMemo(() => {
    const sections = new Map<string, ProfileFieldMeta[]>();
    for (const field of profileFields) {
      const list = sections.get(field.section) ?? [];
      list.push(field);
      sections.set(field.section, list);
    }
    return Array.from(sections.entries());
  }, [profileFields]);

  function reset() {
    setStep(1);
    setSheet(null);
    setFileName("");
    setParseError(null);
    setMapping([]);
    setMappingError(null);
    setPlan(null);
    setPreviewError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setSheet(null);
    startParsing(async () => {
      const res = await parseSpreadsheet(file);
      if (res?.error) {
        setParseError(res.error);
        return;
      }
      if (res?.sheet) {
        setSheet(res.sheet);
        setMapping(autoMapColumns(res.sheet.headers, profileFields));
      }
    });
  }

  function updateMapping(columnIndex: number, destination: string) {
    setMapping((prev) => {
      const next = prev.filter((m) => m.columnIndex !== columnIndex);
      next.push({ columnIndex, destination });
      next.sort((a, b) => a.columnIndex - b.columnIndex);
      return next;
    });
  }

  function destinationFor(columnIndex: number): string {
    return mapping.find((m) => m.columnIndex === columnIndex)?.destination ?? "";
  }

  function goToPreview() {
    if (!sheet) return;
    const { error } = validateMapping(sheet.headers, mapping);
    if (error) {
      setMappingError(error);
      return;
    }
    setMappingError(null);
    startPreviewing(async () => {
      const res = await previewImport(sheet, mapping);
      if (res?.error) {
        setPreviewError(res.error);
        return;
      }
      setPreviewError(null);
      setPlan(res?.plan ?? null);
      setStep(3);
    });
  }

  function confirmImport() {
    if (!sheet) return;
    startCommitting(async () => {
      const res = await commitImport(sheet, mapping);
      setResult(res);
      setStep(4);
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      {step === 1 && (
        <div className="flex flex-col gap-3.5 rounded-xl border border-rule bg-surface p-5">
          <StepEyebrow step={1} />
          <p className="text-[13.5px] leading-[1.5] text-slate">
            Upload the spreadsheet as sent by the CDPO — a .xlsx workbook or a .csv file. The
            first row must be column headers.
          </p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              className="block w-full text-[14px] text-ink"
            />
          </div>
          {parsing && <p className="text-[13px] text-slate">Reading {fileName}…</p>}
          {parseError && <p className="text-[13.5px] text-closing">{parseError}</p>}

          {sheet && !parsing && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-slate">
                {sheet.headers.length} columns · {sheet.rows.length} data rows found. First 5
                rows:
              </p>
              <div className="overflow-x-auto rounded-md border border-rule">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="border-b border-rule bg-paper text-slate">
                    <tr>
                      {sheet.headers.map((h, i) => (
                        <th key={i} className="h-9 px-2.5 font-medium whitespace-nowrap">
                          {h || `Column ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-rule last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="h-9 px-2.5 whitespace-nowrap text-ink">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex h-11 w-fit items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Continue to mapping
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && sheet && (
        <div className="flex flex-col gap-3.5 rounded-xl border border-rule bg-surface p-5">
          <StepEyebrow step={2} />
          <p className="text-[13.5px] leading-[1.5] text-slate">
            Choose what each column becomes. Exactly one column must map to Email — it&apos;s
            used to find the matching student.
          </p>

          <div className="flex flex-col gap-2.5">
            {sheet.headers.map((header, columnIndex) => {
              const samples = sheet.rows
                .slice(0, 3)
                .map((row) => row[columnIndex])
                .filter((v) => v.trim() !== "");
              return (
                <div
                  key={columnIndex}
                  className="grid grid-cols-1 items-center gap-2.5 rounded-md border border-rule p-3 sm:grid-cols-[1fr_1.2fr]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {header || `Column ${columnIndex + 1}`}
                    </p>
                    {samples.length > 0 && (
                      <p className="truncate text-[11.5px] text-shut">
                        e.g. {samples.join(" · ")}
                      </p>
                    )}
                  </div>
                  <select
                    value={destinationFor(columnIndex)}
                    onChange={(e) => updateMapping(columnIndex, e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Ignore this column</option>
                    <option value="email">Email (match key)</option>
                    <optgroup label="Student record">
                      {CORE_FIELDS.map((field) => (
                        <option key={field.key} value={`core:${field.key}`}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                    {sectionedFields.map(([section, fields]) => (
                      <optgroup key={section} label={section}>
                        {fields.map((field) => (
                          <option key={field.field_key} value={`field:${field.field_key}`}>
                            {field.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {mappingError && <p className="text-[13.5px] text-closing">{mappingError}</p>}
          {previewError && <p className="text-[13.5px] text-closing">{previewError}</p>}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goToPreview}
              disabled={previewing}
              className="flex h-11 items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white disabled:opacity-60 sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {previewing ? "Checking…" : "Continue to preview"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && plan && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-xl border border-rule bg-surface p-5">
            <StepEyebrow step={3} />
            <p className="text-[13.5px] leading-[1.5] text-slate">
              Nothing has been written yet. Review what this import will do, then confirm.
            </p>
            <p className="text-[13px] font-medium text-ink">
              {plan.willUpdate} will update · {plan.noChange} no change · {plan.notFound} not
              found
              {plan.totalCellErrors > 0
                ? ` · ${plan.totalCellErrors} cell${plan.totalCellErrors === 1 ? "" : "s"} need attention`
                : ""}
            </p>
          </div>

          <PreviewGroup
            title="Will update"
            rows={plan.rows.filter((r) => r.status === "will_update")}
            tone="update"
          />
          <PreviewGroup
            title="No change"
            rows={plan.rows.filter((r) => r.status === "no_change")}
            tone="quiet"
          />
          <PreviewGroup
            title="Not found"
            rows={plan.rows.filter((r) => r.status === "not_found")}
            tone="closing"
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Back to mapping
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={committing || plan.willUpdate === 0}
              className="flex h-11 items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white disabled:opacity-60 sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {committing
                ? "Importing…"
                : `Confirm import of ${plan.willUpdate} student${plan.willUpdate === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3.5 rounded-xl border border-rule bg-surface p-5">
          <StepEyebrow step={4} />
          {result?.error ? (
            <p className="text-[14px] text-closing">{result.error}</p>
          ) : (
            <>
              <p className="font-display text-[19px] leading-[1.3] font-semibold text-ink">
                Import complete
              </p>
              <div className="flex flex-col gap-1 text-[14px] text-ink">
                <p>{result?.summary?.updated ?? 0} students updated</p>
                <p className="text-slate">
                  {result?.summary?.noChange ?? 0} already matched, no changes needed
                </p>
                <p className="text-slate">{result?.summary?.notFound ?? 0} emails not found</p>
                {(result?.summary?.cellErrors ?? 0) > 0 && (
                  <p className="text-closing">
                    {result?.summary?.cellErrors} cell{result?.summary?.cellErrors === 1 ? "" : "s"}{" "}
                    skipped for a bad value
                  </p>
                )}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={reset}
            className="flex h-11 w-fit items-center rounded-md border border-navy px-4.5 font-body text-[14px] font-semibold text-navy sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Start another import
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewGroup({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ImportPlan["rows"];
  tone: "update" | "quiet" | "closing";
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-surface">
      <div className="border-b border-rule bg-paper px-4 py-2.5">
        <p className="text-[12.5px] font-semibold text-ink">
          {title} ({rows.length})
        </p>
      </div>
      <div className="flex flex-col">
        {rows.map((row) => (
          <div key={row.rowNumber} className="border-b border-rule px-4 py-3 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[13.5px] font-medium text-ink">
                {row.rawEmail || "(no email on this row)"}
                {row.studentName ? ` · ${row.studentName}` : ""}
              </p>
              <p className="text-[11.5px] text-shut">Row {row.rowNumber}</p>
            </div>
            {tone === "update" && row.changes.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {row.changes.map((change, i) => (
                  <li key={i} className="text-[12.5px] text-slate">
                    <span className="text-ink">{change.label}</span>: {change.before} →{" "}
                    <span className="font-medium text-ink">{change.after}</span>
                  </li>
                ))}
              </ul>
            )}
            {tone === "closing" && (
              <p className="mt-1 text-[12.5px] text-closing">No student with this email.</p>
            )}
            {row.cellErrors.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {row.cellErrors.map((cellError, i) => (
                  <li key={i} className="text-[12.5px] text-closing">
                    {cellError.header}: {cellError.message} — left unchanged
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
