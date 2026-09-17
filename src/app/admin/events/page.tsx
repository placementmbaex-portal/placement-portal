import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST, nowMs } from "@/lib/format";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/calendar";
import { DeleteEventButton } from "./delete-event-button";

type EventRow = {
  id: string;
  title: string;
  type: EventType;
  starts_at: string;
  visibility: string;
  company: { name: string } | null;
  job: { title: string } | null;
};

export default async function AdminEventsPage() {
  const { supabase } = await requireAdmin();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, type, starts_at, visibility, company:companies(name), job:jobs(title)")
    .order("starts_at", { ascending: true })
    .overrideTypes<EventRow[], { merge: false }>();

  const rows = events ?? [];
  const upcomingCount = rows.filter((row) => new Date(row.starts_at).getTime() >= nowMs()).length;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {rows.length} events · {upcomingCount} upcoming
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Events
          </h1>
          <p className="mt-1 text-[13.5px] leading-[1.5] text-slate">
            Job deadlines appear on /events automatically and aren&apos;t managed here.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="flex h-11 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Add event
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-slate">
          No events yet. Add one to see it appear on /events.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-rule bg-paper text-slate">
                <tr>
                  <th className="h-10 px-4 font-medium">Title</th>
                  <th className="h-10 px-4 font-medium">Type</th>
                  <th className="h-10 px-4 font-medium">Company / role</th>
                  <th className="h-10 px-4 font-medium">Starts</th>
                  <th className="h-10 px-4 font-medium">Visible to</th>
                  <th className="h-10 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="h-12 border-b border-rule last:border-0">
                    <td className="px-4 font-medium text-ink">{row.title}</td>
                    <td className="px-4 text-slate">{EVENT_TYPE_LABELS[row.type]}</td>
                    <td className="px-4 text-slate">
                      {[row.company?.name, row.job?.title].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 whitespace-nowrap tabular-nums text-slate">
                      {formatDateTimeIST(row.starts_at)}
                    </td>
                    <td className="px-4 text-slate">
                      {row.visibility === "shortlisted" ? "Shortlisted only" : "Everyone"}
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3.5">
                        <Link href={`/admin/events/${row.id}/edit`} className="text-navy hover:underline">
                          Edit
                        </Link>
                        <DeleteEventButton eventId={row.id} title={row.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-[14px] border border-rule bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-semibold text-ink">
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate">
                      {EVENT_TYPE_LABELS[row.type]}
                      {row.company?.name ? ` · ${row.company.name}` : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-slate">
                      {formatDateTimeIST(row.starts_at)} ·{" "}
                      {row.visibility === "shortlisted" ? "Shortlisted only" : "Everyone"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3.5 text-[13px]">
                  <Link href={`/admin/events/${row.id}/edit`} className="font-medium text-navy">
                    Edit
                  </Link>
                  <DeleteEventButton eventId={row.id} title={row.title} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
