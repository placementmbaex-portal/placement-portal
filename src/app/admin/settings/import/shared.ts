// Pure helpers shared between the client wizard and the server actions.
// Nothing here touches Supabase -- it's just column-mapping logic that
// both sides need to agree on.

export const CORE_FIELDS = [
  { key: "name", label: "Name", type: "text" as const },
  { key: "roll_no", label: "Roll no.", type: "text" as const },
  { key: "total_experience_years", label: "Total experience (years)", type: "number" as const },
  { key: "phone", label: "Phone", type: "text" as const },
  { key: "linkedin", label: "LinkedIn", type: "text" as const },
];

export type ProfileFieldMeta = {
  field_key: string;
  label: string;
  field_type: string;
  options: string[] | null;
  section: string;
};

export type ColumnMapping = { columnIndex: number; destination: string };

export type ParsedSheet = { headers: string[]; rows: string[][] };

export type Destination =
  | { kind: "email" }
  | { kind: "core"; column: string }
  | { kind: "field"; fieldKey: string };

export function parseDestination(value: string): Destination | null {
  if (value === "email") return { kind: "email" };
  if (value.startsWith("core:")) return { kind: "core", column: value.slice(5) };
  if (value.startsWith("field:")) return { kind: "field", fieldKey: value.slice(6) };
  return null;
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

// Header text is user-typed, so a loose alnum-only match against either
// the destination's key or its label is far more useful than an exact
// match -- "Roll No." and "roll_no" both normalize the same way.
export function autoMapColumns(
  headers: string[],
  profileFields: ProfileFieldMeta[],
): ColumnMapping[] {
  return headers.map((header, columnIndex) => {
    const h = normalize(header);
    if (h === "email" || h === "emailaddress" || h === "emailid") {
      return { columnIndex, destination: "email" };
    }
    for (const core of CORE_FIELDS) {
      if (normalize(core.key) === h || normalize(core.label) === h) {
        return { columnIndex, destination: `core:${core.key}` };
      }
    }
    for (const field of profileFields) {
      if (normalize(field.field_key) === h || normalize(field.label) === h) {
        return { columnIndex, destination: `field:${field.field_key}` };
      }
    }
    return { columnIndex, destination: "" };
  });
}

export function validateMapping(
  headers: string[],
  mapping: ColumnMapping[],
): { error?: string; emailColumnIndex?: number } {
  const active = mapping.filter((m) => m.destination !== "" && m.destination !== "ignore");

  const emailEntries = active.filter((m) => m.destination === "email");
  if (emailEntries.length === 0) {
    return { error: "Map one column to Email — it's the match key." };
  }
  if (emailEntries.length > 1) {
    return { error: "Only one column can be mapped to Email." };
  }

  const usedDestinations = new Map<string, number>();
  for (const m of active) {
    if (m.columnIndex < 0 || m.columnIndex >= headers.length) {
      return { error: "Mapping refers to a column that doesn't exist." };
    }
    usedDestinations.set(m.destination, (usedDestinations.get(m.destination) ?? 0) + 1);
  }
  const duplicate = Array.from(usedDestinations.entries()).find(([, count]) => count > 1);
  if (duplicate) {
    return { error: "More than one column is mapped to the same destination. Map each field once." };
  }

  return { emailColumnIndex: emailEntries[0].columnIndex };
}
