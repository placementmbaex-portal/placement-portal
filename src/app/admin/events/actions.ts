"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { istDatetimeLocalToUtcIso } from "@/lib/format";

export type EventFormState = { error?: string } | null;

const VALID_TYPES = ["ppt", "test", "interview", "other"];

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { supabase } = await requireAdmin();

  const title = ((formData.get("title") as string) ?? "").trim();
  const type = (formData.get("type") as string) ?? "";
  const companyId = ((formData.get("company_id") as string) ?? "") || null;
  const jobId = ((formData.get("job_id") as string) ?? "") || null;
  const startsLocal = ((formData.get("starts_at") as string) ?? "").trim();
  const endsLocal = ((formData.get("ends_at") as string) ?? "").trim();
  const venue = ((formData.get("venue") as string) ?? "").trim() || null;
  const link = ((formData.get("link") as string) ?? "").trim() || null;
  const visibility = (formData.get("visibility") as string) ?? "all";

  if (!title) return { error: "Title is required." };
  if (!VALID_TYPES.includes(type)) return { error: "Choose an event type." };
  if (!startsLocal || !endsLocal) {
    return { error: "Start and end time are required." };
  }

  const startsAt = istDatetimeLocalToUtcIso(startsLocal);
  const endsAt = istDatetimeLocalToUtcIso(endsLocal);
  if (!startsAt || !endsAt) return { error: "Invalid date or time." };
  if (new Date(endsAt) < new Date(startsAt)) {
    return { error: "End time must be after the start time." };
  }
  if (!venue && !link) {
    return { error: "Provide a venue or a joining link." };
  }
  if (visibility === "shortlisted" && !jobId) {
    return {
      error: "Restricting to shortlisted students needs a related role.",
    };
  }

  const { error } = await supabase.from("events").insert({
    title,
    type,
    company_id: companyId,
    job_id: jobId,
    starts_at: startsAt,
    ends_at: endsAt,
    venue,
    link,
    visibility,
  });

  if (error) {
    return { error: "Could not create the event. Please try again." };
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}
