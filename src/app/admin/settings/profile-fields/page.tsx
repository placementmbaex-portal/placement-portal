import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { FieldsTable } from "./fields-table";

export type ProfileFieldRow = {
  field_key: string;
  label: string;
  field_type: string;
  options: string[] | null;
  section: string;
  display_order: number;
  student_visible: boolean;
  student_editable: boolean;
  required: boolean;
  include_in_export: boolean;
  help_text: string | null;
};

export default async function ProfileFieldsPage() {
  const { supabase } = await requireAdmin();

  const { data: fields } = await supabase
    .from("profile_fields")
    .select(
      "field_key, label, field_type, options, section, display_order, student_visible, student_editable, required, include_in_export, help_text",
    )
    .order("section", { ascending: true })
    .order("display_order", { ascending: true })
    .overrideTypes<ProfileFieldRow[], { merge: false }>();

  const sections = new Map<string, ProfileFieldRow[]>();
  for (const field of fields ?? []) {
    const list = sections.get(field.section) ?? [];
    list.push(field);
    sections.set(field.section, list);
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {fields?.length ?? 0} fields · {sections.size} sections
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Profile fields
          </h1>
        </div>
        <Link
          href="/admin/settings/profile-fields/new"
          className="flex h-11 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Add a field
        </Link>
      </div>

      {sections.size === 0 ? (
        <p className="text-[14px] text-slate">
          No profile fields yet. Add one to start collecting it from students.
        </p>
      ) : (
        <FieldsTable sections={Array.from(sections.entries())} />
      )}
    </main>
  );
}
