"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_CV_BYTES = 2 * 1024 * 1024;
const MAX_CVS = 3;

export type ProfileFieldsFormState = { error?: string; success?: boolean } | null;

// Builds the profile jsonb from whatever is currently marked
// student_editable — never from a client-supplied field list, so a
// hidden/stale form can't smuggle in a value for a field that was locked
// down after the page was rendered. The guard_profile_jsonb trigger also
// filters non-editable keys itself, but that alone isn't enough here: for
// an admin (also a student, also able to open this page) the trigger
// skips its merge entirely and writes `new.profile` as-is, so sending
// only the edited keys would wipe every admin-only field on their own
// row. Fetching and spreading the current profile first keeps this
// correct for both cases; the trigger's own filtering stays real defense
// for the non-admin path, just not the only thing this relies on.
export async function updateProfileFields(
  _prevState: ProfileFieldsFormState,
  formData: FormData,
): Promise<ProfileFieldsFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: student }, { data: fields }] = await Promise.all([
    supabase.from("students").select("profile").eq("id", user.id).single(),
    supabase
      .from("profile_fields")
      .select("field_key, field_type")
      .eq("student_visible", true)
      .eq("student_editable", true),
  ]);

  const profile: Record<string, unknown> = {
    ...((student?.profile as Record<string, unknown> | null) ?? {}),
  };

  for (const field of fields ?? []) {
    const key = field.field_key;
    switch (field.field_type) {
      case "boolean":
        profile[key] = formData.get(key) === "on";
        break;
      case "multiselect":
        profile[key] = formData.getAll(key) as string[];
        break;
      case "number": {
        const raw = ((formData.get(key) as string) ?? "").trim();
        const parsed = raw === "" ? null : Number(raw);
        profile[key] = parsed === null || Number.isNaN(parsed) ? null : parsed;
        break;
      }
      default: {
        const raw = ((formData.get(key) as string) ?? "").trim();
        profile[key] = raw || null;
      }
    }
  }

  const { error } = await supabase
    .from("students")
    .update({ profile })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfileFields: students update failed", error);
    return { error: `Could not save your changes: ${error.message}` };
  }

  revalidatePath("/profile");
  return { success: true };
}

export type UploadCvState = { error?: string; success?: boolean } | null;

export async function uploadCv(
  _prevState: UploadCvState,
  formData: FormData,
): Promise<UploadCvState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const label = ((formData.get("label") as string) ?? "").trim();
  const file = formData.get("file");

  if (!label) {
    return { error: "Please give this CV a label." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { error: "File must be 2MB or smaller." };
  }

  const { count } = await supabase
    .from("cvs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id);

  if ((count ?? 0) >= MAX_CVS) {
    return {
      error: `You already have ${MAX_CVS} CVs. Delete one before uploading another.`,
    };
  }

  const path = `${user.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(path, file, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("uploadCv: storage upload failed", uploadError);
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("cvs").insert({
    student_id: user.id,
    label,
    file_path: path,
  });

  if (insertError) {
    console.error("uploadCv: cvs insert failed", insertError);
    await supabase.storage.from("cvs").remove([path]);
    return { error: `Could not save the CV: ${insertError.message}` };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function deleteCv(cvId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cv } = await supabase
    .from("cvs")
    .select("file_path")
    .eq("id", cvId)
    .eq("student_id", user.id)
    .single();

  if (!cv) return;

  const { error: removeError } = await supabase.storage
    .from("cvs")
    .remove([cv.file_path]);
  if (removeError) {
    console.error("deleteCv: storage remove failed", removeError);
  }

  const { error: deleteError } = await supabase
    .from("cvs")
    .delete()
    .eq("id", cvId);
  if (deleteError) {
    console.error("deleteCv: cvs delete failed", deleteError);
  }

  revalidatePath("/profile");
}

export type UpdateEmailNotificationsResult = { error?: string; debug?: string } | null;

// students.email_notifications isn't in guard_student_update's reset list
// for non-admins (schema_r3.sql), so this write goes straight through RLS
// without needing service-role -- same shape as it, just one boolean.
export async function updateEmailNotifications(
  next: boolean,
): Promise<UpdateEmailNotificationsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("students")
    .update({ email_notifications: next })
    .eq("id", user.id)
    .select("id, email_notifications");

  if (error) {
    console.error("updateEmailNotifications: students update failed", error);
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { debug: JSON.stringify({ userId: user.id, next, returned: data }) };
}

export async function viewCv(cvId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cv } = await supabase
    .from("cvs")
    .select("file_path")
    .eq("id", cvId)
    .eq("student_id", user.id)
    .single();

  if (!cv) redirect("/profile");

  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(cv.file_path, 60);

  if (error || !data) {
    console.error("viewCv: createSignedUrl failed", error);
    redirect("/profile");
  }

  redirect(data.signedUrl);
}
