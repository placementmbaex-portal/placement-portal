export const FIELD_TYPES = [
  "text",
  "longtext",
  "number",
  "date",
  "select",
  "multiselect",
  "boolean",
  "email",
  "phone",
  "url",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];
