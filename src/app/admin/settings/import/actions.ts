"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CORE_FIELDS,
  parseDestination,
  validateMapping,
  type ColumnMapping,
  type ParsedSheet,
} from "./shared";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------
// Step 1 -- upload + parse
// ---------------------------------------------------------------------

export type ParseSheetState = { error?: string; sheet?: ParsedSheet } | null;

function cellToString(cell: unknown): string {
  if (cell === undefined || cell === null) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell);
}

export async function parseSpreadsheet(file: File): Promise<ParseSheetState> {
  await requireAdmin();

  if (!file || file.size === 0) return { error: "Choose a .xlsx or .csv file." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "File must be 5MB or smaller." };

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
    return { error: "Only .xlsx or .csv files are supported." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (err) {
    console.error("parseSpreadsheet: XLSX.read failed", err);
    return { error: "Could not read this file. Is it a valid .xlsx or .csv?" };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { error: "The file has no sheets." };

  const raw = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
  if (raw.length === 0) return { error: "The sheet is empty." };

  const headers = raw[0].map((cell) => cellToString(cell).trim());
  if (headers.every((h) => !h)) return { error: "The first row has no column headers." };

  const rows = raw
    .slice(1)
    .map((row) => headers.map((_, i) => cellToString(row[i])))
    .filter((row) => row.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) return { error: "No data rows found below the header." };

  return { sheet: { headers, rows } };
}

// ---------------------------------------------------------------------
// Shared plan computation -- used by both preview and commit so the two
// can never disagree about what a row will do.
// ---------------------------------------------------------------------

type StudentRow = {
  id: string;
  email: string;
  name: string;
  roll_no: string | null;
  total_experience_years: number | null;
  phone: string | null;
  linkedin: string | null;
  profile: Record<string, unknown> | null;
};

type FieldMeta = { label: string; field_type: string; options: string[] | null };

type ImportContext = {
  studentsByEmail: Map<string, StudentRow>;
  fieldsByKey: Map<string, FieldMeta>;
};

type CellError = { header: string; rawValue: string; message: string };
type FieldChange = { label: string; before: string; after: string };

type InternalPlanRow = {
  rowNumber: number;
  rawEmail: string;
  status: "will_update" | "no_change" | "not_found";
  studentId: string | null;
  studentName: string | null;
  changes: FieldChange[];
  cellErrors: CellError[];
  coreUpdates: Record<string, unknown>;
  profileUpdates: Record<string, unknown>;
};

type InternalPlan = {
  rows: InternalPlanRow[];
  willUpdate: number;
  noChange: number;
  notFound: number;
  totalCellErrors: number;
};

// A value only ever writes if the cell has something in it -- a blank
// cell means "leave unchanged", never "clear this".
function displayCurrent(fieldType: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (fieldType === "boolean") return value === true ? "Yes" : "No";
  if (fieldType === "multiselect") {
    return Array.isArray(value) && value.length > 0 ? (value as string[]).join(", ") : "—";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || "—";
  return "—";
}

function parseDateCell(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

type ValidateResult = { ok: true; value: unknown; display: string } | { ok: false; message: string };

function validateAndFormat(
  fieldType: string,
  rawValue: string,
  options: string[] | null,
): ValidateResult {
  const trimmed = rawValue.trim();
  switch (fieldType) {
    case "number": {
      const n = Number(trimmed);
      if (Number.isNaN(n)) return { ok: false, message: `"${rawValue}" is not a number.` };
      return { ok: true, value: n, display: String(n) };
    }
    case "date": {
      const iso = parseDateCell(trimmed);
      if (!iso) return { ok: false, message: `"${rawValue}" is not a date.` };
      return { ok: true, value: iso, display: iso };
    }
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (["yes", "true", "1", "y"].includes(lower)) return { ok: true, value: true, display: "Yes" };
      if (["no", "false", "0", "n"].includes(lower)) return { ok: true, value: false, display: "No" };
      return { ok: false, message: `"${rawValue}" is not yes/no.` };
    }
    case "select": {
      const match = (options ?? []).find((o) => o.toLowerCase() === trimmed.toLowerCase());
      if (!match) return { ok: false, message: `"${rawValue}" is not one of the allowed options.` };
      return { ok: true, value: match, display: match };
    }
    case "multiselect": {
      const parts = trimmed.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      const resolved: string[] = [];
      for (const part of parts) {
        const match = (options ?? []).find((o) => o.toLowerCase() === part.toLowerCase());
        if (!match) return { ok: false, message: `"${part}" is not one of the allowed options.` };
        resolved.push(match);
      }
      return { ok: true, value: resolved, display: resolved.join(", ") };
    }
    default:
      return { ok: true, value: trimmed, display: trimmed };
  }
}

async function fetchImportContext(): Promise<ImportContext> {
  const service = createServiceRoleClient();
  const [{ data: students }, { data: fields }] = await Promise.all([
    service
      .from("students")
      .select("id, email, name, roll_no, total_experience_years, phone, linkedin, profile"),
    service.from("profile_fields").select("field_key, label, field_type, options"),
  ]);

  const studentsByEmail = new Map<string, StudentRow>();
  for (const s of (students ?? []) as StudentRow[]) {
    studentsByEmail.set(s.email.trim().toLowerCase(), s);
  }
  const fieldsByKey = new Map<string, FieldMeta>();
  for (const f of (fields ?? []) as (FieldMeta & { field_key: string })[]) {
    fieldsByKey.set(f.field_key, { label: f.label, field_type: f.field_type, options: f.options });
  }
  return { studentsByEmail, fieldsByKey };
}

function computeImportPlan(
  sheet: ParsedSheet,
  mapping: ColumnMapping[],
  context: ImportContext,
  emailColumnIndex: number,
): InternalPlan {
  const fieldMappings = mapping.filter((m) => {
    const dest = parseDestination(m.destination);
    return dest !== null && dest.kind !== "email";
  });

  const rows: InternalPlanRow[] = sheet.rows.map((row, i) => {
    const rowNumber = i + 2; // +1 for 1-based, +1 for the header row
    const rawEmail = (row[emailColumnIndex] ?? "").trim();

    if (!rawEmail) {
      return {
        rowNumber,
        rawEmail: "",
        status: "not_found",
        studentId: null,
        studentName: null,
        changes: [],
        cellErrors: [],
        coreUpdates: {},
        profileUpdates: {},
      };
    }

    const student = context.studentsByEmail.get(rawEmail.toLowerCase());
    if (!student) {
      return {
        rowNumber,
        rawEmail,
        status: "not_found",
        studentId: null,
        studentName: null,
        changes: [],
        cellErrors: [],
        coreUpdates: {},
        profileUpdates: {},
      };
    }

    const changes: FieldChange[] = [];
    const cellErrors: CellError[] = [];
    const coreUpdates: Record<string, unknown> = {};
    const profileUpdates: Record<string, unknown> = {};

    for (const m of fieldMappings) {
      const dest = parseDestination(m.destination);
      if (!dest || dest.kind === "email") continue;

      const header = sheet.headers[m.columnIndex];
      const rawValue = row[m.columnIndex] ?? "";
      if (rawValue.trim() === "") continue; // blank cell -- leave unchanged

      if (dest.kind === "core") {
        const core = CORE_FIELDS.find((c) => c.key === dest.column);
        if (!core) continue;
        const result = validateAndFormat(core.type, rawValue, null);
        if (!result.ok) {
          cellErrors.push({ header, rawValue, message: result.message });
          continue;
        }
        const before = displayCurrent(
          core.type,
          (student as unknown as Record<string, unknown>)[core.key],
        );
        if (before !== result.display) {
          changes.push({ label: core.label, before, after: result.display });
          coreUpdates[core.key] = result.value;
        }
      } else {
        const meta = context.fieldsByKey.get(dest.fieldKey);
        if (!meta) {
          cellErrors.push({ header, rawValue, message: "This profile field no longer exists." });
          continue;
        }
        const result = validateAndFormat(meta.field_type, rawValue, meta.options);
        if (!result.ok) {
          cellErrors.push({ header, rawValue, message: result.message });
          continue;
        }
        const currentProfile = student.profile ?? {};
        const before = displayCurrent(meta.field_type, currentProfile[dest.fieldKey]);
        if (before !== result.display) {
          changes.push({ label: meta.label, before, after: result.display });
          profileUpdates[dest.fieldKey] = result.value;
        }
      }
    }

    return {
      rowNumber,
      rawEmail,
      status: changes.length > 0 ? "will_update" : "no_change",
      studentId: student.id,
      studentName: student.name,
      changes,
      cellErrors,
      coreUpdates,
      profileUpdates,
    };
  });

  return {
    rows,
    willUpdate: rows.filter((r) => r.status === "will_update").length,
    noChange: rows.filter((r) => r.status === "no_change").length,
    notFound: rows.filter((r) => r.status === "not_found").length,
    totalCellErrors: rows.reduce((sum, r) => sum + r.cellErrors.length, 0),
  };
}

// ---------------------------------------------------------------------
// Step 3 -- preview (read-only)
// ---------------------------------------------------------------------

export type PublicPlanRow = Omit<InternalPlanRow, "coreUpdates" | "profileUpdates">;
export type ImportPlan = {
  rows: PublicPlanRow[];
  willUpdate: number;
  noChange: number;
  notFound: number;
  totalCellErrors: number;
};
export type PreviewResult = { error?: string; plan?: ImportPlan } | null;

export async function previewImport(
  sheet: ParsedSheet,
  mapping: ColumnMapping[],
): Promise<PreviewResult> {
  await requireAdmin();

  const { error, emailColumnIndex } = validateMapping(sheet.headers, mapping);
  if (error || emailColumnIndex === undefined) {
    return { error: error ?? "Map one column to Email." };
  }

  const context = await fetchImportContext();
  const plan = computeImportPlan(sheet, mapping, context, emailColumnIndex);

  return {
    plan: {
      rows: plan.rows.map(({ coreUpdates: _coreUpdates, profileUpdates: _profileUpdates, ...row }) => row),
      willUpdate: plan.willUpdate,
      noChange: plan.noChange,
      notFound: plan.notFound,
      totalCellErrors: plan.totalCellErrors,
    },
  };
}

// ---------------------------------------------------------------------
// Step 4 -- confirm (writes)
// ---------------------------------------------------------------------

export type CommitResult =
  | {
      error?: string;
      summary?: { updated: number; noChange: number; notFound: number; cellErrors: number };
    }
  | null;

export async function commitImport(
  sheet: ParsedSheet,
  mapping: ColumnMapping[],
): Promise<CommitResult> {
  // requireAdmin's client is what actually performs the writes below --
  // see the comment further down for why, despite this being "the
  // service role key" step per the spec.
  const { supabase } = await requireAdmin();

  const { error, emailColumnIndex } = validateMapping(sheet.headers, mapping);
  if (error || emailColumnIndex === undefined) {
    return { error: error ?? "Map one column to Email." };
  }

  // The bulk lookup this import needs -- every student, every field
  // definition -- runs through the service role so it isn't paying for
  // per-row RLS evaluation on a table scan. It's read-only either way.
  const context = await fetchImportContext();
  const plan = computeImportPlan(sheet, mapping, context, emailColumnIndex);

  let updated = 0;

  for (const row of plan.rows) {
    if (row.status !== "will_update") continue;

    const student = context.studentsByEmail.get(row.rawEmail.toLowerCase());
    if (!student) continue;

    const update: Record<string, unknown> = { ...row.coreUpdates };
    if (Object.keys(row.profileUpdates).length > 0) {
      // Merge onto the current profile in application code rather than
      // sending just the changed keys: guard_student_update and
      // guard_profile_jsonb both branch on is_admin(), which reads
      // auth.uid() -- and a service-role connection has no session, so
      // auth.uid() is null there and both triggers would treat the write
      // as coming from a non-admin. For guard_student_update that means
      // name/roll_no/total_experience_years get silently reverted; for
      // guard_profile_jsonb it means only student_editable keys survive
      // the merge, which is backwards for a committee data load that's
      // mostly filling in the admin-only fields. Writing through this
      // request's own authenticated admin session (requireAdmin's
      // `supabase`, not the service-role client) keeps auth.uid() real,
      // so both triggers correctly take their is_admin() branch instead.
      update.profile = { ...(student.profile ?? {}), ...row.profileUpdates };
    }

    if (Object.keys(update).length === 0) continue;

    const { error: updateError } = await supabase
      .from("students")
      .update(update)
      .eq("id", row.studentId);

    if (updateError) {
      console.error("commitImport: students update failed", updateError, {
        studentId: row.studentId,
      });
      continue;
    }
    updated += 1;
  }

  revalidatePath("/admin/settings/access");
  revalidatePath("/profile");

  return {
    summary: {
      updated,
      noChange: plan.noChange,
      notFound: plan.notFound,
      cellErrors: plan.totalCellErrors,
    },
  };
}
