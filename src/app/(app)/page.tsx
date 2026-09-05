import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST } from "@/lib/format";
import { JobCard } from "@/components/job-card";
import {
  AnnouncementCard,
  type AnnouncementData,
  type CommentData,
} from "@/components/announcement-card";

const FEED_LIMIT = 50;

type OpenJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
  company: { id: string; name: string } | null;
};

type ApplicationRow = {
  id: string;
  applied_at: string;
  job: { id: string; title: string; company: { name: string } | null } | null;
  cv: { label: string } | null;
};

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: student },
    { data: openJobs },
    { data: applications },
    { data: announcements },
    { data: mySubmissions },
  ] = await Promise.all([
    supabase.from("students").select("is_admin").eq("id", user.id).single(),
    supabase
      .from("jobs")
      .select("id, title, location, deadline, company:companies(id, name)")
      .eq("is_open", true)
      .order("deadline", { ascending: true, nullsFirst: false })
      .overrideTypes<OpenJob[], { merge: false }>(),
    supabase
      .from("applications")
      .select(
        "id, applied_at, job:jobs(id, title, company:companies(name)), cv:cvs(label)",
      )
      .eq("student_id", user.id)
      .order("applied_at", { ascending: false })
      .overrideTypes<ApplicationRow[], { merge: false }>(),
    supabase
      .from("announcements")
      .select(
        "id, title, body, is_pinned, attachment_path, published_at, comments_locked, author_id, company:companies(id, name), job:jobs(id, title)",
      )
      .eq("status", "approved")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(FEED_LIMIT)
      .overrideTypes<AnnouncementRow[], { merge: false }>(),
    supabase
      .from("announcements")
      .select("id, title, status, rejection_reason, created_at")
      .eq("author_id", user.id)
      .neq("status", "approved")
      .order("created_at", { ascending: false })
      .overrideTypes<MySubmission[], { merge: false }>(),
  ]);

  const jobList = openJobs ?? [];
  const applicationList = applications ?? [];
  const appliedJobIds = new Set(
    applicationList.map((application) => application.job?.id).filter(Boolean),
  );

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

  // students_select only lets a student read their own row, so author
  // names for announcements/comments authored by someone else come from
  // the owner-privileged student_names view instead of embedding students().
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

  const announcementCards: AnnouncementData[] = announcementList.map((a) => ({
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

  const submissionList = mySubmissions ?? [];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-4 py-8">
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
            Announcements
          </h1>
          <Link
            href="/announcements/new"
            className="shrink-0 text-[13.5px] text-navy hover:underline"
          >
            Submit an announcement
          </Link>
        </div>
        {announcementCards.length === 0 ? (
          <p className="mt-4 text-[15px] leading-[1.55] text-slate">
            Nothing from the committee yet. Posts will appear here.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {announcementCards.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                comments={commentsByAnnouncement.get(announcement.id) ?? []}
                currentUserId={user.id}
                isAdmin={student?.is_admin ?? false}
              />
            ))}
          </div>
        )}

        {submissionList.length > 0 && (
          <div className="mt-6">
            <h2 className="text-[13.5px] leading-[1.45] font-medium text-slate">
              Your submissions
            </h2>
            <div className="mt-2 divide-y divide-rule">
              {submissionList.map((submission) => (
                <div key={submission.id} className="py-3">
                  <p className="text-[15px] leading-[1.55] text-ink">
                    {submission.title}
                  </p>
                  <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
                    {submission.status === "pending"
                      ? "Awaiting review"
                      : `Not approved — ${submission.rejection_reason}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Open roles
        </h2>
        {jobList.length === 0 ? (
          <p className="mt-4 text-[15px] leading-[1.55] text-slate">
            No open roles right now. New postings will appear here.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {jobList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                companyName={job.company?.name}
                applied={appliedJobIds.has(job.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Your applications
        </h2>
        {applicationList.length === 0 ? (
          <p className="mt-4 text-[15px] leading-[1.55] text-slate">
            You haven&apos;t applied to anything yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {applicationList.map((application) => (
              <Link
                key={application.id}
                href={`/jobs/${application.job?.id}`}
                className="block py-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
                  {application.job?.title}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
                  {application.job?.company?.name}
                </p>
                <p className="mt-1 text-[13.5px] leading-[1.4] text-slate">
                  CV: {application.cv?.label} · Applied{" "}
                  {formatDateIST(application.applied_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
