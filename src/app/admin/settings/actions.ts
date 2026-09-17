"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { templateDropsLink } from "@/lib/whatsapp";

const EMAIL_MODES = ["off", "test", "live"] as const;
type EmailMode = (typeof EMAIL_MODES)[number];

async function upsertSetting(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  userId: string,
  key: string,
  value: unknown,
) {
  return supabase
    .from("app_settings")
    .upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() });
}

// Fires immediately on click, like the other admin toggles in this app
// (togglePin, toggleJobOpen) -- this is the safety switch, so it should
// never be gated behind a separate "Save" the admin might forget to press.
export async function setEmailMode(mode: EmailMode) {
  const { supabase, user } = await requireAdmin();
  if (!EMAIL_MODES.includes(mode)) return;

  const { error } = await upsertSetting(supabase, user.id, "email_mode", mode);
  if (error) console.error("setEmailMode: app_settings upsert failed", error);

  revalidatePath("/admin/settings");
  revalidatePath("/admin", "layout");
}

export type TestRecipientsState = { error?: string; success?: boolean } | null;

export async function updateTestRecipients(
  _prevState: TestRecipientsState,
  formData: FormData,
): Promise<TestRecipientsState> {
  const { supabase, user } = await requireAdmin();

  const emails = formData
    .getAll("recipient")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const invalid = emails.find((email) => !/^\S+@\S+\.\S+$/.test(email));
  if (invalid) return { error: `"${invalid}" doesn't look like a valid email.` };

  const deduped = Array.from(new Set(emails));

  const { error } = await upsertSetting(supabase, user.id, "email_test_recipients", deduped);
  if (error) {
    console.error("updateTestRecipients: app_settings upsert failed", error);
    return { error: `Could not save: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export type EmailDefaultsState = { error?: string; success?: boolean } | null;

export async function updateEmailDefaults(
  _prevState: EmailDefaultsState,
  formData: FormData,
): Promise<EmailDefaultsState> {
  const { supabase, user } = await requireAdmin();

  const from = ((formData.get("email_from") as string) ?? "").trim();
  const announcementDefault = formData.get("announcement_email_default") === "on";

  if (!from) return { error: "From-address is required." };
  if (!/^\S+@\S+\.\S+$/.test(from)) return { error: `"${from}" doesn't look like a valid email.` };

  const [{ error: fromError }, { error: defaultError }] = await Promise.all([
    upsertSetting(supabase, user.id, "email_from", from),
    upsertSetting(supabase, user.id, "announcement_email_default", announcementDefault),
  ]);

  if (fromError || defaultError) {
    console.error("updateEmailDefaults: app_settings upsert failed", fromError ?? defaultError);
    return { error: `Could not save: ${(fromError ?? defaultError)!.message}` };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

const WHATSAPP_TEMPLATE_KEYS = [
  "whatsapp_template_job",
  "whatsapp_template_announcement",
  "whatsapp_template_reminder",
] as const;
type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export type WhatsAppTemplateState = { error?: string; success?: boolean; warning?: string } | null;

export async function updateWhatsAppTemplate(
  key: WhatsAppTemplateKey,
  _prevState: WhatsAppTemplateState,
  formData: FormData,
): Promise<WhatsAppTemplateState> {
  const { supabase, user } = await requireAdmin();
  if (!WHATSAPP_TEMPLATE_KEYS.includes(key)) return { error: "Unknown template." };

  const template = ((formData.get("template") as string) ?? "").trim();
  if (!template) return { error: "Template can't be empty." };

  const { error } = await upsertSetting(supabase, user.id, key, template);
  if (error) {
    console.error("updateWhatsAppTemplate: app_settings upsert failed", error);
    return { error: `Could not save: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin");

  return {
    success: true,
    warning: templateDropsLink(template)
      ? "This template doesn't include {link} -- shared messages won't link back to the portal."
      : undefined,
  };
}
