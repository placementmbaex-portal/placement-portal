import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AnnouncementCard,
  type AnnouncementData,
  type CommentData,
} from "@/components/announcement-card";

const FEED_LIMIT = 50;

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  attachment_path: string | null;
  published_at: string;
  comments_locked: boolean;
  author_id: string;
  company: { id: string; name: string } | null;
  job: { id: string; title: string } | null;
};

type CommentRow = {
  id: string;
  announcement_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_id: string;
};

type MySubmission = {
  id: string;
  title: string;
  status: "pending" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: announcements } = await supabase
    .from("announcements")
    .select(
      "id, title, body, is_pinned, attachment_path, published_at, comments_locked, author_id, company:companies(id, name), job:jobs(id, title)",
    )
    .eq("status", "approved")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(FEED_LIMIT)
    .overrideTypes<AnnouncementRow[], { merge: false }>();

  const { data: mySubmissions } = await supabase
    .from("announcements")
    .select("id, title, status, rejection_reason, created_at")
    .eq("author_id", user.id)
    .neq("status", "approved")
    .order("created_at", { ascending: false })
    .overrideTypes<MySubmission[], { merge: false }>();

  const announcementList = announcements ?? [];
  const announcementIds = announcementList.map((a) => a.id);

  const { data: comments } = announcementIds.length
    ? await supabase
        .from("comments")
        .select("id, announcement_id, parent_id, body, created_at, author_id")
        .in("announcement_id", announcementIds)
        .order("created_at", { ascending: true })
        .overrideTypes<CommentRow[], { merge: false }>()
    : { data: [] as CommentRow[] };

  const commentList = comments ?? [];

  const authorIds = new Set<string>([
    ...announcementList.map((a) => a.author_id),
    ...commentList.map((c) => c.author_id),
  ]);
  const { data: authors } = authorIds.size
    ? await supabase
        .from("student_names")
        .select("id, name")
        .in("id", Array.from(authorIds))
    : { data: [] as { id: string; name: string }[] };
  const authorNames = new Map(
    (authors ?? []).map((author) => [author.id, author.name]),
  );

  const commentsByAnnouncement = new Map<string, CommentData[]>();
  for (const comment of commentList) {
    const list = commentsByAnnouncement.get(comment.announcement_id) ?? [];
    list.push({
      id: comment.id,
      parentId: comment.parent_id,
      body: comment.body,
      createdAt: comment.created_at,
      authorId: comment.author_id,
      authorName: authorNames.get(comment.author_id) ?? "Unknown",
    });
    commentsByAnnouncement.set(comment.announcement_id, list);
  }

  const cards: AnnouncementData[] = announcementList.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    isPinned: a.is_pinned,
    attachmentPath: a.attachment_path,
    publishedAt: a.published_at,
    commentsLocked: a.comments_locked,
    authorName: authorNames.get(a.author_id) ?? "Unknown",
    company: a.company,
    job: a.job,
  }));

  const pinned = cards.filter((c) => c.isPinned);
  const earlier = cards.filter((c) => !c.isPinned);
  const submissionList = mySubmissions ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Slot 1 · {new Date().getFullYear()}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
          Announcements
        </h1>

        <Link
          href="/announcements/new"
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-navy font-body text-[14.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post a submission
        </Link>
        <p className="mt-1.5 text-[11.5px] text-slate">
          Goes to the committee for approval before it appears here.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        {pinned.length > 0 && (
          <>
            <p className="ml-1 font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
              Pinned
            </p>
            {pinned.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                comments={commentsByAnnouncement.get(announcement.id) ?? []}
                currentUserId={user.id}
                isAdmin={student?.is_admin ?? false}
              />
            ))}
          </>
        )}

        {earlier.length > 0 && (
          <>
            <p className="mt-1 ml-1 font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
              Earlier
            </p>
            {earlier.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                comments={commentsByAnnouncement.get(announcement.id) ?? []}
                currentUserId={user.id}
                isAdmin={student?.is_admin ?? false}
              />
            ))}
          </>
        )}

        {cards.length === 0 && (
          <p className="text-[15px] leading-[1.55] text-slate">
            Nothing from the committee yet. Posts appear here once approved.
          </p>
        )}

        {submissionList.length > 0 && (
          <div className="rounded-[14px] border border-dashed border-rule bg-paper p-4">
            <p className="font-body text-[12px] font-semibold tracking-[0.06em] text-slate uppercase">
              Your submissions
            </p>
            {submissionList.map((submission) => (
              <div key={submission.id} className="mt-2">
                <p className="text-[14px] font-medium text-ink">
                  {submission.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-slate">
                  {submission.status === "pending"
                    ? "Awaiting review"
                    : `Not approved — ${submission.rejection_reason}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
