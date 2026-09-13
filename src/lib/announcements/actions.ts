"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export type AnnouncementFormState = { error?: string } | null;

// Shared by both the student "submit for review" form and the admin
// "post directly" form. `publish_immediately` is only ever rendered on the
// admin form, but the live guard_announcement trigger forces status and
// is_pinned back to submission defaults for non-admins regardless, so
// it's safe for one action to serve both.
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
      .from("announcements")
      .upload(attachmentPath, file, { contentType: "application/pdf" });
    if (uploadError) {
      return { error: "Could not upload the attachment. Please try again." };
    }
  }

  // The live guard_announcement trigger (schema_r2.sql) doesn't stamp
  // author_id itself -- unlike the guard_announcement_insert version in
  // schema.sql, which was never actually applied to this database.
  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    author_id: user.id,
    company_id: companyId,
    job_id: jobId,
    attachment_path: attachmentPath,
    ...(publishImmediately ? { status: "approved" } : {}),
  });

  if (error) {
    if (attachmentPath) {
      await supabase.storage
        .from("announcements")
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

  // guard_comment (schema_r2.sql, live) doesn't stamp author_id itself,
  // unlike schema.sql's guard_comment_insert, which was never applied.
  const { error } = await supabase.from("comments").insert({
    announcement_id: announcementId,
    author_id: user.id,
    parent_id: parentId,
    body,
  });

  if (error) {
    // Surfaces guard_comment's own message (locked, unpublished) verbatim.
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
    .from("announcements")
    .createSignedUrl(path, 60);

  if (error || !data) redirect(`/#announcement-${announcementId}`);

  redirect(data.signedUrl);
}
