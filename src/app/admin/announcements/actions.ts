"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { CATEGORY_CHIPS, type AnnouncementCategory } from "@/lib/chips";

const VALID_CATEGORIES = Object.keys(CATEGORY_CHIPS) as AnnouncementCategory[];

export async function approveAnnouncement(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const categoryRaw = (formData.get("category") as string) ?? "";
  const category = VALID_CATEGORIES.includes(categoryRaw as AnnouncementCategory)
    ? (categoryRaw as AnnouncementCategory)
    : undefined;
  const isPinned = formData.get("is_pinned") === "on";

  const { error } = await supabase
    .from("announcements")
    .update({
      status: "approved",
      is_pinned: isPinned,
      ...(category ? { category } : {}),
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/announcements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidatePath("/announcements");
}

export type RejectState = { error?: string } | null;

export async function rejectAnnouncement(
  id: string,
  _prevState: RejectState,
  formData: FormData,
): Promise<RejectState> {
  const { supabase } = await requireAdmin();

  const reason = ((formData.get("reason") as string) ?? "").trim();
  if (!reason) return { error: "Please explain why this is being rejected." };

  const { error } = await supabase
    .from("announcements")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return null;
}

// Fire-and-forget toggles bound to a target value rather than "flip the
// current one", so a stale page never un-does someone else's change.
// Errors (namely the pin trigger's 3-item cap) redirect back with the
// trigger's own message in the query string, matching /login's pattern.

export async function togglePin(
  id: string,
  nextPinned: boolean,
  _formData: FormData,
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned: nextPinned })
    .eq("id", id);

  if (error) {
    redirect(`/admin/announcements?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidatePath("/announcements");
}

export async function toggleCommentsLocked(
  id: string,
  nextLocked: boolean,
  _formData: FormData,
) {
  const { supabase } = await requireAdmin();

  await supabase
    .from("announcements")
    .update({ comments_locked: nextLocked })
    .eq("id", id);

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidatePath("/announcements");
}
