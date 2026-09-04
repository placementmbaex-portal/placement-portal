"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_CV_BYTES = 2 * 1024 * 1024;
const MAX_CVS = 3;

export type ProfileFormState = { error?: string; success?: boolean } | null;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const phone = ((formData.get("phone") as string) ?? "").trim();
  const linkedin = ((formData.get("linkedin") as string) ?? "").trim();

  const { error } = await supabase
    .from("students")
    .update({ phone: phone || null, linkedin: linkedin || null })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your changes. Please try again." };
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
    return { error: "Upload failed. Please try again." };
  }

  const { error: insertError } = await supabase.from("cvs").insert({
    student_id: user.id,
    label,
    file_path: path,
  });

  if (insertError) {
    await supabase.storage.from("cvs").remove([path]);
    return { error: "Could not save the CV. Please try again." };
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

  await supabase.storage.from("cvs").remove([cv.file_path]);
  await supabase.from("cvs").delete().eq("id", cvId);

  revalidatePath("/profile");
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

  if (error || !data) redirect("/profile");

  redirect(data.signedUrl);
}
