"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { notify } from "@/lib/notify";
import { absoluteUrl } from "@/lib/site-url";

export async function approveAnnouncement(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const isPinned = formData.get("is_pinned") === "on";

  // Read before the update, not after -- an admin can re-save an already-
  // approved post (e.g. flip is_pinned via this same form), and that must
  // not re-notify every student a second time.
  const { data: existing } = await supabase
    .from("announcements")
    .select("status, title, body, send_email")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("announcements")
    .update({ status: "approved", is_pinned: isPinned })
    .eq("id", id);

  if (error) {
    console.error("approveAnnouncement: announcements update failed", error);
    redirect(`/admin/announcements?error=${encodeURIComponent(error.message)}`);
  }

  if (existing && existing.status !== "approved") {
    const { data: students } = await supabase.from("students").select("id");
    const studentIds = (students ?? []).map((s) => s.id);
    const title = `New announcement: ${existing.title}`;

    await notify(supabase, {
      studentIds,
      type: "announcement_approved",
      title,
      body: existing.title,
      link: "/announcements",
      email: existing.send_email
        ? {
            subject: title,
            html: `<p>${existing.body}</p><p><a href="${absoluteUrl("/announcements")}">View on the portal</a></p>`,
          }
        : undefined,
    });
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

  if (error) {
    console.error("rejectAnnouncement: announcements update failed", error);
    return { error: error.message };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return null;
}

// Fire-and-forget toggles bound to a target value rather than "flip the
// current one", so a stale page never un-does someone else's change. Any
// DB-side rejection redirects back with the trigger's own message in the
// query string, matching /login's pattern.

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
    console.error("togglePin: announcements update failed", error);
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

  const { error } = await supabase
    .from("announcements")
    .update({ comments_locked: nextLocked })
    .eq("id", id);
  if (error) {
    console.error("toggleCommentsLocked: announcements update failed", error);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidatePath("/announcements");
}

// Both copy and open count as "shared" (WhatsAppShare calls this from
// either action) -- never cleared automatically, so it answers "has this
// ever been shared," not "was it shared for the most recent change."
export async function markAnnouncementWhatsAppShared(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("announcements")
    .update({ whatsapp_shared_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("markAnnouncementWhatsAppShared: announcements update failed", error);

  revalidatePath("/admin/announcements");
}

// Soft delete only -- hidden from every student and from this list
// (announcements_select's RLS policy filters deleted_at, comments vanish
// with it transitively), but recoverable from /admin/settings/trash.
// Permanent, unrecoverable deletion is a separate action reachable only
// from there: permanentlyDeleteAnnouncement in settings/trash/actions.ts.
export async function deleteAnnouncement(id: string, _formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const { error } = await supabase
    .from("announcements")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);
  if (error) {
    console.error("deleteAnnouncement: announcements soft-delete failed", error);
    return;
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/settings/trash");
  revalidatePath("/");
  revalidatePath("/announcements");
}
