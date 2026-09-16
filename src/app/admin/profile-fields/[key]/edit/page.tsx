import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { FieldForm } from "../../field-form";
import { updateProfileField } from "../../actions";

export default async function EditProfileFieldPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { key } = await params;

  const [{ data: field }, { data: sections }] = await Promise.all([
    supabase
      .from("profile_fields")
      .select(
        "field_key, label, field_type, options, section, display_order, required, help_text",
      )
      .eq("field_key", key)
      .single(),
    supabase.from("profile_fields").select("section").order("section"),
  ]);

  if (!field) notFound();

  const existingSections = Array.from(
    new Set((sections ?? []).map((row) => row.section as string)),
  );

  return (
    <main>
      <FieldForm
        action={updateProfileField.bind(null, field.field_key)}
        existingSections={existingSections}
        defaultValues={field}
      />
    </main>
  );
}
