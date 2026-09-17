import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { DEFAULT_WHATSAPP_TEMPLATES, WHATSAPP_PLACEHOLDERS } from "@/lib/whatsapp";
import { EmailModeSelector } from "./email-mode-selector";
import { TestRecipientsForm } from "./test-recipients-form";
import { EmailFromForm } from "./email-from-form";
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
    <div className="max-w-2xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
      <div className="border-b border-rule bg-paper px-5.5 py-4.5">
        <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.75 text-[12.5px] text-slate">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-5 px-5.5 py-5">{children}</div>
    </div>
  );
}

export default async function NotificationsSettingsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .overrideTypes<AppSettingRow[], { merge: false }>();

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const mode = (byKey.get("email_mode") as "off" | "test" | "live" | undefined) ?? "off";
  const testRecipients = (byKey.get("email_test_recipients") as string[] | undefined) ?? [];
  const emailFrom = (byKey.get("email_from") as string | undefined) ?? "placements@yourdomain.com";
  const whatsappJobTemplate =
    (byKey.get("whatsapp_template_job") as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.job;
  const whatsappAnnouncementTemplate =
    (byKey.get("whatsapp_template_announcement") as string | undefined) ??
    DEFAULT_WHATSAPP_TEMPLATES.announcement;
  const whatsappReminderTemplate =
    (byKey.get("whatsapp_template_reminder") as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.reminder;

  // Never read the key's value, only whether one is present -- that's
  // enough to tell an admin why every send is coming back "failed" in the
  // email log without ever exposing the secret itself.
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <main className="flex flex-col gap-5">
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Email mode: {mode}
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Notifications
        </h1>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-[1.5] text-slate">
          Check{" "}
          <Link href="/admin/settings/email-log" className="text-navy hover:underline">
            the email log
          </Link>{" "}
          after any change to confirm it behaved the way you expect.
        </p>
      </div>

      <Section title="In-app notifications">
        <p className="text-[13.5px] leading-[1.5] text-ink">
          Always on for every student — a bell, a panel, and nothing to configure. They cost
          nothing to send, so they&apos;re never gated behind a mode like email is.
        </p>
      </Section>

      <Section title="Email" subtitle="The safety switch. Nothing goes to real students until mode is Live.">
        <div>
          <p className="mb-1.5 text-[12.5px] text-slate">Sending capability</p>
          {resendConfigured ? (
            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-live">
              <span className="h-1.75 w-1.75 rounded-full bg-live" />
              Configured
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-closing">
              <span className="h-1.75 w-1.75 rounded-full bg-closing" />
              Not configured — add RESEND_API_KEY to send anything for real
            </p>
          )}
        </div>

        <div className="h-px bg-rule" />

        <div>
          <p className="mb-1.5 text-[12.5px] text-slate">Mode</p>
          <EmailModeSelector mode={mode} />
        </div>

        <div className="h-px bg-rule" />

        <div>
          <p className="mb-1.5 text-[12.5px] text-slate">Test recipients — where every email goes while mode is Test</p>
          <TestRecipientsForm recipients={testRecipients} />
        </div>

        <div className="h-px bg-rule" />

        <EmailFromForm emailFrom={emailFrom} />
      </Section>

      <Section
        title="WhatsApp templates"
        subtitle="Used by the Share on WhatsApp button on jobs, announcements, and the daily digest on Overview."
      >
        <p className="rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[11.5px] leading-[1.6] text-slate">
          {WHATSAPP_PLACEHOLDERS.map((p) => `{${p}}`).join("  ")}
        </p>
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
      </Section>
    </main>
  );
}
