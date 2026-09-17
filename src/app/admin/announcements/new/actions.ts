"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { parseAndUploadAnnouncement } from "@/lib/announcements/actions";
import { notify, type NotifyEmailOutcome } from "@/lib/notify";
import { resolveAudience, type Audience } from "@/lib/audience";
import { absoluteUrl } from "@/lib/site-url";

export async function getAudienceCount(
  audience: Audience,
  jobId: string | null,
  handPickedIds: string[],
): Promise<number> {
  const { supabase } = await requireAdmin();
  const ids = await resolveAudience(supabase, audience, jobId, handPickedIds);
  return ids.length;
}

export type StudentSearchResult = { id: string; name: string; email: string; rollNo: string | null };

export async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  const { supabase } = await requireAdmin();

  // Strip characters that would break PostgREST's .or() filter syntax
  // rather than try to escape them -- a search box has no reason to need
  // literal commas or parentheses.
  const q = query.trim().replace(/[,()%]/g, "");
  if (q.length < 2) return [];

  const { data } = await supabase
    .from("students")
    .select("id, name, email, roll_no")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,roll_no.ilike.%${q}%`)
    .order("name")
    .limit(8);

  return (data ?? []).map((s) => ({ id: s.id, name: s.name, email: s.email, rollNo: s.roll_no }));
}

export type PostAnnouncementState =
  | { error: string }
  | {
      success: true;
      title: string;
      recipientCount: number;
      emailAttempted: boolean;
      skippedForEmailToggle: number;
      emailOutcomes: NotifyEmailOutcome[];
    }
  | null;

export async function postAnnouncement(
  _prevState: PostAnnouncementState,
  formData: FormData,
): Promise<PostAnnouncementState> {
  const { supabase, user } = await requireAdmin();

  const parsed = await parseAndUploadAnnouncement(supabase, user.id, formData);
  if (!parsed.ok) return { error: parsed.error };

  const publishImmediately = formData.get("publish_immediately") === "on";
  const sendEmailFlag = formData.get("send_email") === "on";

  const { data: created, error } = await supabase
    .from("announcements")
    .insert({
      title: parsed.title,
      body: parsed.body,
      author_id: user.id,
      company_id: parsed.companyId,
      job_id: parsed.jobId,
      attachment_path: parsed.attachmentPath,
      send_email: sendEmailFlag,
      ...(publishImmediately ? { status: "approved" } : {}),
    })
    .select("id, title")
    .single();

  if (error || !created) {
    console.error("postAnnouncement: announcements insert failed", error);
    if (parsed.attachmentPath) {
      await supabase.storage.from("announcements").remove([parsed.attachmentPath]);
    }
    return { error: `Could not post the announcement: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/");
  revalidatePath("/admin/announcements");

  // A post left pending has no audience yet -- it isn't visible to anyone
  // until a later approval, which is where notification already happens
  // (approveAnnouncement, still "everyone" -- this composer's targeting is
  // only meaningful for a post that goes live right now).
  if (!publishImmediately) {
    redirect("/admin/announcements");
  }

  const audience = ((formData.get("audience") as string) || "everyone") as Audience;
  const audienceJobId = ((formData.get("audience_job_id") as string) ?? "") || null;
  const handPickedIds = formData
    .getAll("hand_picked_id")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const studentIds = await resolveAudience(supabase, audience, audienceJobId, handPickedIds);
  const title = `New announcement: ${parsed.title}`;

  const result = await notify(supabase, {
    studentIds,
    type: "announcement_approved",
    title,
    body: parsed.title,
    link: "/announcements",
    email: sendEmailFlag
      ? {
          subject: title,
          html: `<p>${parsed.body}</p><p><a href="${absoluteUrl("/announcements")}">View on the portal</a></p>`,
        }
      : undefined,
  });

  return {
    success: true,
    title: created.title,
    recipientCount: studentIds.length,
    emailAttempted: sendEmailFlag,
    skippedForEmailToggle: result.skippedForEmailToggle,
    emailOutcomes: result.emailOutcomes,
  };
}
