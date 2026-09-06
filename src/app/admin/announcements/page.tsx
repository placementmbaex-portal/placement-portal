import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { CATEGORY_CHIPS, type AnnouncementCategory } from "@/lib/chips";
import { RejectDialog } from "./reject-dialog";
import { approveAnnouncement, togglePin, toggleCommentsLocked } from "./actions";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  status: "pending" | "approved" | "rejected";
  is_pinned: boolean;
  comments_locked: boolean;
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
  author: { name: string; roll_no: string | null } | null;
};

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { status: statusParam, error } = await searchParams;

  const { data: announcements } = await supabase
    .from("announcements")
    .select(
      "id, title, body, category, status, is_pinned, comments_locked, rejection_reason, created_at, published_at, author:students(name, roll_no)",
    )
    .order("created_at", { ascending: false })
    .overrideTypes<AnnouncementRow[], { merge: false }>();

  const all = announcements ?? [];
  const pending = all.filter((a) => a.status === "pending");
  const approved = all.filter((a) => a.status === "approved");
  const rejected = all.filter((a) => a.status === "rejected");
  const byTab = { pending, approved, rejected };

  const activeTab: "pending" | "approved" | "rejected" =
    statusParam === "approved" || statusParam === "rejected"
      ? statusParam
      : "pending";
  const oldestPending = pending[pending.length - 1];

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          {pending.length > 0 && oldestPending && (
            <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-closing uppercase">
              {pending.length} waiting · oldest {daysAgo(oldestPending.created_at)}
            </p>
          )}
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Announcements
          </h1>
        </div>
        <Link
          href="/admin/announcements/new"
          className="flex h-10 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white"
        >
          Post an announcement
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-[13.5px] text-closing">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "pending" ? "/admin/announcements" : `/admin/announcements?status=${tab.key}`}
              className={`flex h-[34px] items-center rounded-lg px-3.5 font-body text-[12.5px] ${
                active
                  ? "bg-ink font-semibold text-white"
                  : "border border-rule bg-surface font-medium text-ink"
              }`}
            >
              {tab.label} {byTab[tab.key].length}
            </Link>
          );
        })}
      </div>

      {activeTab === "pending" ? (
        pending.length === 0 ? (
          <p className="text-[14px] text-slate">Nothing waiting on you.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((announcement) => (
              <div
                key={announcement.id}
                className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-4.5 shadow-[0_1px_3px_rgba(22,32,46,0.08)] lg:flex-row lg:items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-[5px] bg-[#FDEAE0] px-1.75 py-1 font-body text-[10px] font-bold tracking-[0.07em] text-closing uppercase">
                      Pending {daysAgo(announcement.created_at)}
                    </span>
                    <span className="text-[12px] text-slate">
                      {announcement.author?.name}
                      {announcement.author?.roll_no
                        ? ` · ${announcement.author.roll_no}`
                        : ""}{" "}
                      · submitted {formatDateTimeIST(announcement.created_at)}
                    </span>
                  </div>
                  <p className="mt-2.5 font-display text-[19px] leading-[1.3] font-semibold text-ink">
                    {announcement.title}
                  </p>
                  <p className="mt-1.5 max-w-[68ch] whitespace-pre-wrap text-[14px] leading-[1.6] text-ink">
                    {announcement.body}
                  </p>
                </div>

                <form
                  action={approveAnnouncement.bind(null, announcement.id)}
                  className="flex w-full flex-col gap-2.5 lg:w-[230px] lg:shrink-0"
                >
                  <div>
                    <label
                      htmlFor={`category-${announcement.id}`}
                      className="mb-1.5 block text-[11.5px] text-slate"
                    >
                      Category
                    </label>
                    <select
                      id={`category-${announcement.id}`}
                      name="category"
                      defaultValue={announcement.category}
                      className="h-9 w-full rounded-md border border-rule px-2.5 text-[13px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                    >
                      {Object.entries(CATEGORY_CHIPS).map(([value, chip]) => (
                        <option key={value} value={value}>
                          {chip.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-[13px] text-ink">
                    <input type="checkbox" name="is_pinned" className="h-3.5 w-3.5" />
                    Pin to the top
                  </label>
                  <button
                    type="submit"
                    className="flex h-10 items-center justify-center rounded-md bg-navy font-body text-[13.5px] font-semibold text-white"
                  >
                    Approve and publish
                  </button>
                  <RejectDialog announcementId={announcement.id} />
                </form>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-rule bg-paper text-slate">
              <tr>
                <th className="h-10 px-4 font-medium">Title</th>
                <th className="h-10 px-4 font-medium">Author</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Date</th>
                <th className="h-10 px-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {byTab[activeTab].length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate">
                    Nothing here yet.
                  </td>
                </tr>
              ) : (
                byTab[activeTab].map((announcement) => (
                  <tr key={announcement.id} className="border-b border-rule last:border-0">
                    <td className="px-4 py-2.5 text-ink">{announcement.title}</td>
                    <td className="px-4 py-2.5 text-slate">{announcement.author?.name}</td>
                    <td className="px-4 py-2.5 text-slate">
                      {announcement.status === "approved"
                        ? announcement.is_pinned
                          ? "Pinned"
                          : "Published"
                        : "Rejected"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate">
                      {formatDateTimeIST(announcement.published_at ?? announcement.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {announcement.status === "approved" ? (
                        <>
                          <form
                            className="inline"
                            action={togglePin.bind(null, announcement.id, !announcement.is_pinned)}
                          >
                            <button type="submit" className="text-navy hover:underline">
                              {announcement.is_pinned ? "Unpin" : "Pin"}
                            </button>
                          </form>
                          <span className="text-rule"> | </span>
                          <form
                            className="inline"
                            action={toggleCommentsLocked.bind(
                              null,
                              announcement.id,
                              !announcement.comments_locked,
                            )}
                          >
                            <button type="submit" className="text-navy hover:underline">
                              {announcement.comments_locked ? "Unlock comments" : "Lock comments"}
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="text-slate">{announcement.rejection_reason}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
