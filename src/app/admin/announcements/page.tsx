import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-url";
import { DEFAULT_WHATSAPP_TEMPLATES, fillWhatsAppTemplate } from "@/lib/whatsapp";
import { WhatsAppShareModal } from "@/components/whatsapp-share-modal";
import { NotSharedMarker } from "@/components/not-shared-marker";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RejectDialog } from "./reject-dialog";
import {
  approveAnnouncement,
  togglePin,
  toggleCommentsLocked,
  markAnnouncementWhatsAppShared,
  deleteAnnouncement,
} from "./actions";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  is_pinned: boolean;
  comments_locked: boolean;
  rejection_reason: string | null;
  whatsapp_shared_at: string | null;
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

  const [{ data: announcements }, { data: whatsappSetting }] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, title, body, status, is_pinned, comments_locked, rejection_reason, whatsapp_shared_at, created_at, published_at, author:students(name, roll_no)",
      )
      .order("created_at", { ascending: false })
      .overrideTypes<AnnouncementRow[], { merge: false }>(),
    supabase.from("app_settings").select("value").eq("key", "whatsapp_template_announcement").single(),
  ]);

  const whatsappTemplate =
    (whatsappSetting?.value as string | undefined) ?? DEFAULT_WHATSAPP_TEMPLATES.announcement;

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
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
          className="flex h-11 w-full items-center justify-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10 sm:w-auto sm:justify-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
              className={`flex h-11 items-center rounded-lg px-3.5 font-body text-[12.5px] sm:h-[34px] ${
                active
                  ? "bg-ink font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  : "border border-rule bg-surface font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
                  <label className="flex items-center gap-2 text-[13px] text-ink">
                    <input type="checkbox" name="is_pinned" className="h-3.5 w-3.5" />
                    Pin to the top
                  </label>
                  <button
                    type="submit"
                    className="flex h-11 items-center justify-center rounded-md bg-navy font-body text-[13.5px] font-semibold text-white sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Approve and publish
                  </button>
                  <RejectDialog announcementId={announcement.id} />
                </form>
              </div>
            ))}
          </div>
        )
      ) : byTab[activeTab].length === 0 ? (
        <p className="text-[14px] text-slate">Nothing here yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
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
                {byTab[activeTab].map((announcement) => {
                  const notShared = announcement.status === "approved" && !announcement.whatsapp_shared_at;
                  const whatsappMessage = fillWhatsAppTemplate(whatsappTemplate, {
                    title: announcement.title,
                    excerptSource: announcement.body,
                    link: absoluteUrl("/announcements"),
                  });
                  return (
                    <tr key={announcement.id} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2.5 text-ink">{announcement.title}</td>
                      <td className="px-4 py-2.5 text-slate">{announcement.author?.name}</td>
                      <td className="px-4 py-2.5 text-slate">
                        <span className="inline-flex items-center gap-2">
                          {announcement.status === "approved"
                            ? announcement.is_pinned
                              ? "Pinned"
                              : "Published"
                            : "Rejected"}
                          {notShared && <NotSharedMarker />}
                        </span>
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
                              <button
                                type="submit"
                                className="text-navy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                              >
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
                              <button
                                type="submit"
                                className="text-navy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                              >
                                {announcement.comments_locked ? "Unlock comments" : "Lock comments"}
                              </button>
                            </form>
                            <span className="text-rule"> | </span>
                            <WhatsAppShareModal
                              title={`Share ${announcement.title}`}
                              message={whatsappMessage}
                              onShare={markAnnouncementWhatsAppShared.bind(null, announcement.id)}
                              triggerClassName="text-navy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                            />
                            <span className="text-rule"> | </span>
                          </>
                        ) : (
                          <span className="mr-2 text-slate">{announcement.rejection_reason}</span>
                        )}
                        <form className="inline" action={deleteAnnouncement.bind(null, announcement.id)}>
                          <ConfirmSubmitButton
                            confirmMessage={`Delete "${announcement.title}"? It can be restored from Trash.`}
                            pendingLabel="Deleting…"
                            className="text-closing hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            {byTab[activeTab].map((announcement) => {
              const notShared = announcement.status === "approved" && !announcement.whatsapp_shared_at;
              const whatsappMessage = fillWhatsAppTemplate(whatsappTemplate, {
                title: announcement.title,
                excerptSource: announcement.body,
                link: absoluteUrl("/announcements"),
              });
              return (
                <div key={announcement.id} className="rounded-[14px] border border-rule bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-medium text-ink">{announcement.title}</p>
                    <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-slate">
                      {announcement.status === "approved"
                        ? announcement.is_pinned
                          ? "Pinned"
                          : "Published"
                        : "Rejected"}
                      {notShared && <NotSharedMarker />}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate">
                    {announcement.author?.name} ·{" "}
                    {formatDateTimeIST(announcement.published_at ?? announcement.created_at)}
                  </p>
                  {announcement.status === "approved" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <form action={togglePin.bind(null, announcement.id, !announcement.is_pinned)}>
                        <button
                          type="submit"
                          className="flex h-11 items-center font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {announcement.is_pinned ? "Unpin" : "Pin"}
                        </button>
                      </form>
                      <form
                        action={toggleCommentsLocked.bind(
                          null,
                          announcement.id,
                          !announcement.comments_locked,
                        )}
                      >
                        <button
                          type="submit"
                          className="flex h-11 items-center font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {announcement.comments_locked ? "Unlock comments" : "Lock comments"}
                        </button>
                      </form>
                      <WhatsAppShareModal
                        title={`Share ${announcement.title}`}
                        message={whatsappMessage}
                        onShare={markAnnouncementWhatsAppShared.bind(null, announcement.id)}
                        triggerLabel="Share"
                        triggerClassName="flex h-11 items-center font-body text-[13px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      />
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[12.5px] text-slate">{announcement.rejection_reason}</p>
                  )}
                  <form action={deleteAnnouncement.bind(null, announcement.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Delete "${announcement.title}"? It can be restored from Trash.`}
                      pendingLabel="Deleting…"
                      className="flex h-11 items-center font-body text-[13px] font-medium text-closing disabled:opacity-60"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
