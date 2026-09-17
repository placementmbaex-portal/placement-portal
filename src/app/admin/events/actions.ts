"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { istDatetimeLocalToUtcIso } from "@/lib/format";

export type EventFormState = { error?: string } | null;

const VALID_TYPES = ["ppt", "test", "interview", "other"];

type ParsedEvent =
  | {
      ok: true;
      title: string;
      type: string;
      companyId: string | null;
      jobId: string | null;
      startsAt: string;
      endsAt: string;
      venue: string | null;
      link: string | null;
      visibility: string;
    }
  | { ok: false; error: string };

function parseEvent(formData: FormData): ParsedEvent {
  const title = ((formData.get("title") as string) ?? "").trim();
  const type = (formData.get("type") as string) ?? "";
  const companyId = ((formData.get("company_id") as string) ?? "") || null;
  const jobId = ((formData.get("job_id") as string) ?? "") || null;
  const startsLocal = ((formData.get("starts_at") as string) ?? "").trim();
  const endsLocal = ((formData.get("ends_at") as string) ?? "").trim();
  const venue = ((formData.get("venue") as string) ?? "").trim() || null;
  const link = ((formData.get("link") as string) ?? "").trim() || null;
  const visibility = (formData.get("visibility") as string) ?? "all";

  if (!title) return { ok: false, error: "Title is required." };
  if (!VALID_TYPES.includes(type)) return { ok: false, error: "Choose an event type." };
  if (!startsLocal || !endsLocal) {
    return { ok: false, error: "Start and end time are required." };
  }

  const startsAt = istDatetimeLocalToUtcIso(startsLocal);
  const endsAt = istDatetimeLocalToUtcIso(endsLocal);
  if (!startsAt || !endsAt) return { ok: false, error: "Invalid date or time." };
  if (new Date(endsAt) < new Date(startsAt)) {
    return { ok: false, error: "End time must be after the start time." };
  }
  if (!venue && !link) {
    return { ok: false, error: "Provide a venue or a joining link." };
  }
  if (visibility === "shortlisted" && !jobId) {
    return { ok: false, error: "Restricting to shortlisted students needs a related role." };
  }

  return { ok: true, title, type, companyId, jobId, startsAt, endsAt, venue, link, visibility };
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { supabase, user } = await requireAdmin();

  const parsed = parseEvent(formData);
  if (!parsed.ok) return { error: parsed.error };

  // The live events table has no guard_event_insert trigger (schema.sql's
  // version was never applied to this database) and created_by is
  // nullable, so it must be set explicitly here or attribution is lost.
  const { error } = await supabase.from("events").insert({
    title: parsed.title,
    type: parsed.type,
    company_id: parsed.companyId,
    job_id: parsed.jobId,
    starts_at: parsed.startsAt,
    ends_at: parsed.endsAt,
    venue: parsed.venue,
    link: parsed.link,
    visibility: parsed.visibility,
    created_by: user.id,
  });

  if (error) {
    console.error("createEvent: events insert failed", error);
    return { error: `Could not create the event: ${error.message}` };
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseEvent(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.title,
      type: parsed.type,
      company_id: parsed.companyId,
      job_id: parsed.jobId,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      venue: parsed.venue,
      link: parsed.link,
      visibility: parsed.visibility,
    })
    .eq("id", eventId);

  if (error) {
    console.error("updateEvent: events update failed", error);
    return { error: `Could not save changes: ${error.message}` };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEvent(eventId: string, _formData: FormData) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    console.error("deleteEvent: events delete failed", error);
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
}

// Mirrors is_shortlisted_for()'s own status set exactly -- that function is
// viewer-relative (auth.uid()), so it can't be called directly to count
// everyone; this is the same predicate run as a plain count instead.
export async function getShortlistedCount(jobId: string): Promise<number> {
  const { supabase } = await requireAdmin();
  if (!jobId) return 0;

  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", ["shortlisted", "in_process", "offer"]);

  return count ?? 0;
}
