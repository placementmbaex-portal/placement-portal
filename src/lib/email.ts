import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailMode = "off" | "test" | "live";

const DEFAULT_FROM = "placements@yourdomain.com";

type SendEmailParams = {
  studentId: string;
  to: string;
  subject: string;
  html: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readEmailSettings(supabase: SupabaseClient<any, any, any>) {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["email_mode", "email_test_recipients", "email_from"]);

  const byKey = new Map((data ?? []).map((row) => [row.key as string, row.value]));
  return {
    mode: (byKey.get("email_mode") as EmailMode | undefined) ?? "off",
    testRecipients: (byKey.get("email_test_recipients") as string[] | undefined) ?? [],
    from: (byKey.get("email_from") as string | undefined) ?? DEFAULT_FROM,
  };
}

async function logEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  row: {
    to_email: string;
    intended_for: string;
    subject: string;
    status: "sent" | "suppressed" | "failed";
    mode: EmailMode;
    error?: string;
  },
) {
  const { error } = await supabase.from("email_log").insert(row);
  if (error) console.error("sendEmail: email_log insert failed", error);
}

// The one function every email-sending trigger goes through (PRD 5.2's
// safety mode). app_settings.email_mode decides what actually happens; every
// outcome -- suppressed, sent or failed -- writes an email_log row, which is
// the only way /admin/email-log can prove test mode is doing what it should.
//
// Takes the caller's own Supabase client rather than reaching for the
// service-role key itself: every current call site is either an
// admin-authenticated server action (RLS already allows it, via is_admin())
// or the deadline-reminder cron route, which builds its own service-role
// client because it has no user session to authenticate with. Per
// CLAUDE.md, service-role is reserved for exactly that second case.
export async function sendEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { studentId, to, subject, html }: SendEmailParams,
) {
  const { mode, testRecipients, from } = await readEmailSettings(supabase);

  if (mode === "off") {
    await logEmail(supabase, {
      to_email: to,
      intended_for: studentId,
      subject,
      status: "suppressed",
      mode,
    });
    return;
  }

  if (mode === "test" && testRecipients.length === 0) {
    await logEmail(supabase, {
      to_email: to,
      intended_for: studentId,
      subject,
      status: "suppressed",
      mode,
      error: "email_mode is 'test' but no email_test_recipients are configured.",
    });
    return;
  }

  const sendTo = mode === "test" ? testRecipients : [to];
  const sendSubject = mode === "test" ? `[TEST -> ${to}] ${subject}` : subject;
  const sendHtml =
    mode === "test"
      ? `<p style="margin:0 0 16px;padding:10px 14px;border:1px solid #f0c36d;background:#fff8e6;border-radius:6px;font:13px/1.5 sans-serif;color:#7a5a00;">Test mode: this would have gone to <strong>${to}</strong>.</p>${html}`
      : html;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: sendTo,
      subject: sendSubject,
      html: sendHtml,
    });

    if (error) {
      await logEmail(supabase, {
        to_email: sendTo.join(", "),
        intended_for: studentId,
        subject: sendSubject,
        status: "failed",
        mode,
        error: error.message,
      });
      return;
    }

    await logEmail(supabase, {
      to_email: sendTo.join(", "),
      intended_for: studentId,
      subject: sendSubject,
      status: mode === "test" ? "suppressed" : "sent",
      mode,
    });
  } catch (err) {
    await logEmail(supabase, {
      to_email: sendTo.join(", "),
      intended_for: studentId,
      subject: sendSubject,
      status: "failed",
      mode,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
