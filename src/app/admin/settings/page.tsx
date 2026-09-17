import { requireAdmin } from "@/lib/supabase/require-admin";
import { SettingsSubNav } from "@/components/settings-subnav";
import { DEFAULT_WHATSAPP_TEMPLATES, WHATSAPP_PLACEHOLDERS } from "@/lib/whatsapp";
import { EmailModeSelector } from "./email-mode-selector";
import { TestRecipientsForm } from "./test-recipients-form";
import { EmailDefaultsForm } from "./email-defaults-form";
import { WhatsAppTemplateEditor } from "./whatsapp-template-editor";

type AppSettingRow = { key: string; value: unknown };

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
      <div className="border-b border-rule bg-paper px-5.5 py-4.5">
        <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.75 text-[12.5px] text-slate">{subtitle}</p>}
      </div>
      <div className="px-5.5 py-5">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .overrideTypes<AppSettingRow[], { merge: false }>();

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const mode = (byKey.get("email_mode") as "off" | "test" | "live" | undefined) ?? "off";
  const testRecipients = (byKey.get("email_test_recipients") as string[] | undefined) ?? [];
  const emailFrom = (byKey.get("email_from") as string | undefined) ?? "placements@yourdomain.com";
  const announcementEmailDefault =
    (byKey.get("announcement_email_default") as boolean | undefined) ?? true;
  const whatsappJobTemplate =
    (byKey.get("whatsapp_template_job") as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.job;
  const whatsappAnnouncementTemplate =
    (byKey.get("whatsapp_template_announcement") as string | undefined) ??
    DEFAULT_WHATSAPP_TEMPLATES.announcement;
  const whatsappReminderTemplate =
    (byKey.get("whatsapp_template_reminder") as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.reminder;

  return (
    <main className="flex flex-col gap-5">
      <SettingsSubNav />
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Email mode: {mode}
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-slate">
          Controls every email the portal sends. Check /admin/email-log after any change to confirm
          it behaved the way you expect.
        </p>
      </div>

      <Section
        title="Email mode"
        subtitle="The safety switch. Nothing goes to real students until this is Live."
      >
        <EmailModeSelector mode={mode} />
      </Section>

      <Section
        title="Test recipients"
        subtitle="Where every email is redirected while mode is Test."
      >
        <TestRecipientsForm recipients={testRecipients} />
      </Section>

      <Section title="Defaults">
        <EmailDefaultsForm emailFrom={emailFrom} announcementEmailDefault={announcementEmailDefault} />
      </Section>

      <Section
        title="WhatsApp templates"
        subtitle="Used by the Share on WhatsApp button on jobs, announcements, and the daily digest on Overview."
      >
        <p className="mb-4 rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[11.5px] leading-[1.6] text-slate">
          {WHATSAPP_PLACEHOLDERS.map((p) => `{${p}}`).join("  ")}
        </p>
        <div className="flex flex-col gap-6">
          <WhatsAppTemplateEditor
            templateKey="whatsapp_template_job"
            label="New role opened"
            helpText="Shown after a role is set to open, and from Share on the Jobs list."
            defaultValue={whatsappJobTemplate}
          />
          <div className="h-px bg-rule" />
          <WhatsAppTemplateEditor
            templateKey="whatsapp_template_announcement"
            label="Announcement approved"
            helpText="Shown after an announcement is approved, and from Share on Announcements."
            defaultValue={whatsappAnnouncementTemplate}
          />
          <div className="h-px bg-rule" />
          <WhatsAppTemplateEditor
            templateKey="whatsapp_template_reminder"
            label="Daily digest line"
            helpText="One block per role, joined together in the combined message on Overview when 2 or more roles open the same day."
            defaultValue={whatsappReminderTemplate}
          />
        </div>
      </Section>
    </main>
  );
}
