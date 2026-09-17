import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { absoluteUrl } from "@/lib/site-url";
import { AnnouncementDefaultForm } from "./announcement-default-form";

type AppSettingRow = { key: string; value: unknown };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-2xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
      <div className="border-b border-rule bg-paper px-5.5 py-4.5">
        <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-5.5 py-5">{children}</div>
    </div>
  );
}

export default async function GeneralSettingsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("key", "announcement_email_default")
    .overrideTypes<AppSettingRow[], { merge: false }>();

  const announcementEmailDefault =
    (data?.find((row) => row.key === "announcement_email_default")?.value as boolean | undefined) ?? true;

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] leading-[1.2] font-semibold text-ink">General</h1>
      </div>

      <Section title="Portal base URL">
        <p className="font-mono text-[13.5px] text-ink">{absoluteUrl("")}</p>
        <p className="text-[12px] leading-[1.5] text-shut">
          Used to build absolute links in emails and WhatsApp messages. Set via
          NEXT_PUBLIC_SITE_URL in the deployment environment — not editable here.
        </p>
      </Section>

      <Section title="Announcement defaults">
        <AnnouncementDefaultForm announcementEmailDefault={announcementEmailDefault} />
      </Section>

      <Section title="Branding">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-iimc.svg"
            alt="IIM Calcutta"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <p className="font-body text-[19px] font-bold text-navy">
            MBA<span className="text-flame">Ex</span>
          </p>
        </div>
        <p className="text-[12px] leading-[1.5] text-shut">
          Fixed for this cohort. Contact the dev team to change the marks, colours or name.
        </p>
      </Section>

      <div className="h-px max-w-2xl bg-rule" />

      <div className="max-w-2xl">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-closing uppercase">
          Danger zone
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          <Link href="/admin/settings/trash" className="text-[13.5px] text-closing underline underline-offset-2">
            Trash — restore a soft-deleted company, role or announcement
          </Link>
          <Link
            href="/admin/settings/trash?view=log"
            className="text-[13.5px] text-closing underline underline-offset-2"
          >
            Deletion log — what was permanently destroyed, and by whom
          </Link>
        </div>
      </div>
    </main>
  );
}
