"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { upsertSetting } from "@/lib/app-settings";

export type AnnouncementDefaultState = { error?: string; success?: boolean } | null;

export async function updateAnnouncementDefault(
  _prevState: AnnouncementDefaultState,
  formData: FormData,
): Promise<AnnouncementDefaultState> {
  const { supabase, user } = await requireAdmin();

  const announcementDefault = formData.get("announcement_email_default") === "on";

  const { error } = await upsertSetting(
    supabase,
    user.id,
    "announcement_email_default",
    announcementDefault,
  );
  if (error) {
    console.error("updateAnnouncementDefault: app_settings upsert failed", error);
    return { error: `Could not save: ${error.message}` };
  }

  revalidatePath("/admin/settings/general");
  return { success: true };
}
