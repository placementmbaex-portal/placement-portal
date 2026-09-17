"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export type AnnouncementFormState = { error?: string } | null;

export type ParsedAnnouncement =
  | { ok: true; title: string; body: string; companyId: string | null; jobId: string | null; attachmentPath: string | null }
  | { ok: false; error: string };

// Shared by createAnnouncement (student submit / plain admin post) and
// postAnnouncement (the audience-targeting admin composer) -- the field
// parsing, validation and attachment upload are identical either way; only
// what happens after the insert differs.
export async function parseAndUploadAnnouncement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  formData: FormData,
): Promise<ParsedAnnouncement> {
  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Body is required." };

  const companyId = ((formData.get("company_id") as string) ?? "") || null;
  const jobId = ((formData.get("job_id") as string) ?? "") || null;

  let attachmentPath: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      return { ok: false, error: "Attachments must be a PDF." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "Attachment must be 2MB or smaller." };
    }

    attachmentPath = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("announcements")
      .upload(attachmentPath, file, { contentType: "application/pdf" });
    if (uploadError) {
      console.error("parseAndUploadAnnouncement: attachment upload failed", uploadError);
      return { ok: false, error: `Could not upload the attachment: ${uploadError.message}` };
    }
  }

  return { ok: true, title, body, companyId, jobId, attachmentPath };
}

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

  const parsed = await parseAndUploadAnnouncement(supabase, user.id, formData);
  if (!parsed.ok) return { error: parsed.error };

  const publishImmediately = formData.get("publish_immediately") === "on";

  // The live guard_announcement trigger (schema_r2.sql) doesn't stamp
  // author_id itself -- unlike the guard_announcement_insert version in
  // schema.sql, which was never actually applied to this database.
  const { error } = await supabase.from("announcements").insert({
    title: parsed.title,
    body: parsed.body,
    author_id: user.id,
    company_id: parsed.companyId,
    job_id: parsed.jobId,
    attachment_path: parsed.attachmentPath,
    ...(publishImmediately ? { status: "approved" } : {}),
  });

  if (error) {
    console.error("createAnnouncement: announcements insert failed", error);
    if (parsed.attachmentPath) {
      await supabase.storage
        .from("announcements")
        .remove([parsed.attachmentPath]);
    }
    return { error: `Could not submit the announcement: ${error.message}` };
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
    console.error("addComment: comments insert failed", error);
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

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    console.error("deleteComment: comments delete failed", error);
  }
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

  if (error || !data) {
    console.error("viewAnnouncementAttachment: createSignedUrl failed", error);
    redirect(`/#announcement-${announcementId}`);
  }

  redirect(data.signedUrl);
}
