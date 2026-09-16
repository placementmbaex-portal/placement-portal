import { requireAdmin } from "@/lib/supabase/require-admin";
import { FieldForm } from "../field-form";
import { createProfileField } from "../actions";

export default async function NewProfileFieldPage() {
  const { supabase } = await requireAdmin();

  const { data: sections } = await supabase
    .from("profile_fields")
    .select("section")
    .order("section");

  const existingSections = Array.from(
    new Set((sections ?? []).map((row) => row.section as string)),
  );

  return (
    <main>
      <FieldForm action={createProfileField} existingSections={existingSections} />
    </main>
  );
}
