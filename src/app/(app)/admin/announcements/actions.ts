"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function approveAnnouncement(id: string, _formData: FormData) {
  const { supabase } = await requireAdmin();

  await supabase
    .from("announcements")
    .update({ status: "approved" })
    .eq("id", id);

  revalidatePath("/admin/announcements");
  revalidatePath("/");
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
}
