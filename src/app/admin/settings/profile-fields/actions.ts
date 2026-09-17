"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { FIELD_TYPES } from "./constants";

export type ProfileFieldFormState = { error?: string } | null;

function parseFieldForm(formData: FormData) {
  const label = ((formData.get("label") as string) ?? "").trim();
  const fieldType = ((formData.get("field_type") as string) ?? "").trim();
  const section = ((formData.get("section") as string) ?? "").trim() || "Other";
  const displayOrderRaw = ((formData.get("display_order") as string) ?? "").trim();
  const required = formData.get("required") === "on";
  const helpText = ((formData.get("help_text") as string) ?? "").trim();
  const options = (formData.getAll("option") as string[])
    .map((option) => option.trim())
    .filter(Boolean);

  return { label, fieldType, section, displayOrderRaw, required, helpText, options };
}

function validateShared(
  label: string,
  fieldType: string,
  displayOrderRaw: string,
  options: string[],
): { error: string } | null {
  if (!label) return { error: "Label is required." };
  if (!(FIELD_TYPES as readonly string[]).includes(fieldType)) {
    return { error: "Choose a valid field type." };
  }
  if ((fieldType === "select" || fieldType === "multiselect") && options.length === 0) {
    return { error: "Add at least one option for a select or multiselect field." };
  }
  if (displayOrderRaw && Number.isNaN(Number(displayOrderRaw))) {
    return { error: "Display order must be a number." };
  }
  return null;
}

export async function createProfileField(
  _prevState: ProfileFieldFormState,
  formData: FormData,
): Promise<ProfileFieldFormState> {
  const { supabase } = await requireAdmin();

  const fieldKey = ((formData.get("field_key") as string) ?? "").trim().toLowerCase();
  const { label, fieldType, section, displayOrderRaw, required, helpText, options } =
    parseFieldForm(formData);

  if (!/^[a-z][a-z0-9_]*$/.test(fieldKey)) {
    return {
      error:
        "Field key must start with a lowercase letter and contain only lowercase letters, numbers and underscores.",
    };
  }

  const sharedError = validateShared(label, fieldType, displayOrderRaw, options);
  if (sharedError) return sharedError;

  const { error } = await supabase.from("profile_fields").insert({
    field_key: fieldKey,
    label,
    field_type: fieldType,
    section,
    display_order: displayOrderRaw ? Number(displayOrderRaw) : 100,
    required,
    help_text: helpText || null,
    options: options.length > 0 ? options : null,
  });

  if (error) {
    console.error("createProfileField: insert failed", error);
    return { error: `Could not create the field: ${error.message}` };
  }

  revalidatePath("/admin/settings/profile-fields");
  redirect("/admin/settings/profile-fields");
}

export async function updateProfileField(
  fieldKey: string,
  _prevState: ProfileFieldFormState,
  formData: FormData,
): Promise<ProfileFieldFormState> {
  const { supabase } = await requireAdmin();

  const { label, fieldType, section, displayOrderRaw, required, helpText, options } =
    parseFieldForm(formData);

  const sharedError = validateShared(label, fieldType, displayOrderRaw, options);
  if (sharedError) return sharedError;

  const { error } = await supabase
    .from("profile_fields")
    .update({
      label,
      field_type: fieldType,
      section,
      display_order: displayOrderRaw ? Number(displayOrderRaw) : 100,
      required,
      help_text: helpText || null,
      options: options.length > 0 ? options : null,
    })
    .eq("field_key", fieldKey);

  if (error) {
    console.error("updateProfileField: update failed", error);
    return { error: `Could not save changes: ${error.message}` };
  }

  revalidatePath("/admin/settings/profile-fields");
  redirect("/admin/settings/profile-fields");
}

export async function deleteProfileField(fieldKey: string, _formData: FormData) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profile_fields")
    .delete()
    .eq("field_key", fieldKey);

  if (error) {
    console.error("deleteProfileField: delete failed", error);
  }

  revalidatePath("/admin/settings/profile-fields");
}

export type ToggleColumn = "student_visible" | "student_editable" | "include_in_export";

export async function toggleProfileFieldFlag(
  fieldKey: string,
  column: ToggleColumn,
  value: boolean,
): Promise<{ error?: string } | null> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profile_fields")
    .update({ [column]: value })
    .eq("field_key", fieldKey);

  if (error) {
    console.error("toggleProfileFieldFlag: update failed", error);
    return { error: error.message };
  }

  revalidatePath("/admin/settings/profile-fields");
  return null;
}

export async function reorderProfileFields(
  orderedKeys: string[],
): Promise<{ error?: string } | null> {
  const { supabase } = await requireAdmin();

  const results = await Promise.all(
    orderedKeys.map((fieldKey, index) =>
      supabase
        .from("profile_fields")
        .update({ display_order: (index + 1) * 10 })
        .eq("field_key", fieldKey),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("reorderProfileFields: update failed", failed.error);
    return { error: failed.error.message };
  }

  revalidatePath("/admin/settings/profile-fields");
  return null;
}
