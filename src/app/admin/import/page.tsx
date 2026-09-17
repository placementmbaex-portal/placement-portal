import { requireAdmin } from "@/lib/supabase/require-admin";
import { SettingsSubNav } from "@/components/settings-subnav";
import { ImportWizard } from "./import-wizard";
import type { ProfileFieldMeta } from "./shared";

export default async function ImportPage() {
  const { supabase } = await requireAdmin();

  const { data: profileFields } = await supabase
    .from("profile_fields")
    .select("field_key, label, field_type, options, section")
    .order("section", { ascending: true })
    .order("display_order", { ascending: true })
    .overrideTypes<ProfileFieldMeta[], { merge: false }>();

  return (
    <main className="flex flex-col gap-5">
      <SettingsSubNav />
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Master data
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Import
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-slate">
          Load a spreadsheet from the CDPO into student records. Matches are made on email;
          nothing is written until you confirm.
        </p>
      </div>
      <ImportWizard profileFields={profileFields ?? []} />
    </main>
  );
}
