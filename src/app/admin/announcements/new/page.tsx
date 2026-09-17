import { requireAdmin } from "@/lib/supabase/require-admin";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { AnnouncementComposer } from "./composer";

type JobOption = {
  id: string;
  title: string;
  company: { name: string } | null;
};

type AppSettingRow = { key: string; value: unknown };

export default async function NewAdminAnnouncementPage() {
  const { supabase } = await requireAdmin();

  const [{ data: companies }, { data: jobs }, { data: settings }] = await Promise.all([
    supabase.from("companies").select("id, name").is("deleted_at", null).order("name"),
    supabase
      .from("jobs")
      .select("id, title, company:companies(name)")
      .is("deleted_at", null)
      .order("title")
      .overrideTypes<JobOption[], { merge: false }>(),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["email_mode", "announcement_email_default", "whatsapp_template_announcement"])
      .overrideTypes<AppSettingRow[], { merge: false }>(),
  ]);

  const jobOptions = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    companyName: job.company?.name ?? "",
  }));

  const byKey = new Map((settings ?? []).map((row) => [row.key, row.value]));
  const emailMode = (byKey.get("email_mode") as "off" | "test" | "live" | undefined) ?? "off";
  const announcementEmailDefault = (byKey.get("announcement_email_default") as boolean | undefined) ?? true;
  const whatsappTemplate =
    (byKey.get("whatsapp_template_announcement") as string | undefined) ??
    DEFAULT_WHATSAPP_TEMPLATES.announcement;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
        Post announcement
      </h1>
      <AnnouncementComposer
        companies={companies ?? []}
        jobs={jobOptions}
        emailMode={emailMode}
        announcementEmailDefault={announcementEmailDefault}
        whatsappTemplate={whatsappTemplate}
      />
    </main>
  );
}
