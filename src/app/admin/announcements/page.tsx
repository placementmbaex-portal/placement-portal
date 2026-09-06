import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateIST } from "@/lib/format";
import { RejectDialog } from "./reject-dialog";
import { approveAnnouncement, togglePin, toggleCommentsLocked } from "./actions";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  is_pinned: boolean;
  comments_locked: boolean;
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
  author: { name: string } | null;
};

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;

  const { data: announcements } = await supabase
    .from("announcements")
    .select(
      "id, title, body, status, is_pinned, comments_locked, rejection_reason, created_at, published_at, author:students(name)",
    )
    .order("created_at", { ascending: false })
    .overrideTypes<AnnouncementRow[], { merge: false }>();

  const all = announcements ?? [];
  const pending = all.filter((a) => a.status === "pending");
  const others = all.filter((a) => a.status !== "pending");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
          Announcements
        </h1>
        <Link
          href="/admin/announcements/new"
          className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90"
        >
          Post announcement
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-rule bg-paper px-3 py-2 text-[13.5px] text-closing">
          {error}
        </p>
      )}

      <section>
        <h2 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-[15px] leading-[1.55] text-slate">
            Nothing waiting on you.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-rule">
            {pending.map((announcement) => (
              <div key={announcement.id} className="py-4">
                <p className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
                  {announcement.title}
                </p>
                <p className="mt-0.5 text-[13.5px] leading-[1.45] text-slate">
                  {announcement.author?.name} · Submitted{" "}
                  {formatDateIST(announcement.created_at)}
                </p>
                <p className="mt-2 max-w-[68ch] whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
                  {announcement.body}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <form action={approveAnnouncement.bind(null, announcement.id)}>
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md bg-navy px-4 text-[15px] font-medium text-white hover:bg-navy/90"
                    >
                      Approve
                    </button>
                  </form>
                  <RejectDialog announcementId={announcement.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-[17px] leading-[1.35] font-semibold text-ink">
          Published &amp; rejected
        </h2>
        {others.length === 0 ? (
          <p className="mt-3 text-[15px] leading-[1.55] text-slate">
            Nothing here yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-rule text-slate">
                <tr>
                  <th className="h-10 font-normal">Title</th>
                  <th className="h-10 font-normal">Author</th>
                  <th className="h-10 font-normal">Status</th>
                  <th className="h-10 font-normal">Date</th>
                  <th className="h-10 font-normal" />
                </tr>
              </thead>
              <tbody>
                {others.map((announcement) => (
                  <tr
                    key={announcement.id}
                    className="border-b border-rule last:border-0"
                  >
                    <td className="h-10 text-ink">{announcement.title}</td>
                    <td className="h-10 text-slate">
                      {announcement.author?.name}
                    </td>
                    <td className="h-10 text-slate">
                      {announcement.status === "approved"
                        ? announcement.is_pinned
                          ? "Pinned"
                          : "Published"
                        : "Rejected"}
                    </td>
                    <td className="h-10 whitespace-nowrap text-slate">
                      {formatDateIST(
                        announcement.published_at ?? announcement.created_at,
                      )}
                    </td>
                    <td className="h-10 text-right whitespace-nowrap">
                      {announcement.status === "approved" ? (
                        <>
                          <form
                            className="inline"
                            action={togglePin.bind(
                              null,
                              announcement.id,
                              !announcement.is_pinned,
                            )}
                          >
                            <button
                              type="submit"
                              className="text-navy hover:underline"
                            >
                              {announcement.is_pinned ? "Unpin" : "Pin"}
                            </button>
                          </form>
                          <span className="text-slate"> · </span>
                          <form
                            className="inline"
                            action={toggleCommentsLocked.bind(
                              null,
                              announcement.id,
                              !announcement.comments_locked,
                            )}
                          >
                            <button
                              type="submit"
                              className="text-navy hover:underline"
                            >
                              {announcement.comments_locked
                                ? "Unlock comments"
                                : "Lock comments"}
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-slate">
                          {announcement.rejection_reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
