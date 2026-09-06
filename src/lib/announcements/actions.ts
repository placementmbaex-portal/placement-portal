"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_CHIPS, type AnnouncementCategory } from "@/lib/chips";

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const VALID_CATEGORIES = Object.keys(CATEGORY_CHIPS) as AnnouncementCategory[];

export type AnnouncementFormState = { error?: string } | null;

// Shared by both the student "submit for review" form and the admin
// "post directly" form. `publish_immediately` is only ever rendered on the
// admin form, but guard_announcement_insert forces every moderation field
// back to submission defaults for non-admins regardless, so it's safe for
// one action to serve both.
export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const companyId = ((formData.get("company_id") as string) ?? "") || null;
  const jobId = ((formData.get("job_id") as string) ?? "") || null;
  const publishImmediately = formData.get("publish_immediately") === "on";
  const categoryRaw = (formData.get("category") as string) ?? "general";
  const category: AnnouncementCategory = VALID_CATEGORIES.includes(
    categoryRaw as AnnouncementCategory,
  )
    ? (categoryRaw as AnnouncementCategory)
    : "general";

  let attachmentPath: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      return { error: "Attachments must be a PDF." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "Attachment must be 2MB or smaller." };
    }

    attachmentPath = `${user.id}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("announcement-attachments")
      .upload(attachmentPath, file, { contentType: "application/pdf" });
    if (uploadError) {
      return { error: "Could not upload the attachment. Please try again." };
    }
  }

  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    category,
    company_id: companyId,
    job_id: jobId,
    attachment_path: attachmentPath,
    ...(publishImmediately ? { status: "approved" } : {}),
  });

  if (error) {
    if (attachmentPath) {
      await supabase.storage
        .from("announcement-attachments")
        .remove([attachmentPath]);
    }
    return { error: "Could not submit the announcement. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/admin/announcements");
  redirect(publishImmediately ? "/admin/announcements" : "/");
}

export type CommentFormState = { error?: string; success?: boolean } | null;

export async function addComment(
  announcementId: string,
  parentId: string | null,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = ((formData.get("body") as string) ?? "").trim();
  if (!body) return { error: "Write something first." };

  const { error } = await supabase.from("comments").insert({
    announcement_id: announcementId,
    parent_id: parentId,
    body,
  });

  if (error) {
    // Surfaces guard_comment_insert's own message (locked, unpublished,
    // reply-of-a-reply) verbatim.
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteComment(commentId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath("/");
}

export async function viewAnnouncementAttachment(
  announcementId: string,
  path: string,
  _formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.storage
    .from("announcement-attachments")
    .createSignedUrl(path, 60);

  if (error || !data) redirect(`/#announcement-${announcementId}`);

  redirect(data.signedUrl);
}
