import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST } from "@/lib/format";
import { EVENT_TYPE_LABELS, googleCalendarUrl, type EventType } from "@/lib/calendar";

type EventDetail = {
  id: string;
  title: string;
  type: EventType;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  link: string | null;
  company: { id: string; name: string; deleted_at: string | null } | null;
  job: { id: string; title: string; deleted_at: string | null } | null;
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  // RLS (events_select, via is_shortlisted_for()) already decides whether
  // this row comes back at all -- a restricted event a student can't see
  // simply isn't returned, no separate visibility check needed here.
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, type, starts_at, ends_at, venue, link, company:companies(id, name, deleted_at), job:jobs(id, title, deleted_at)",
    )
    .eq("id", id)
    .single()
    .overrideTypes<EventDetail, { merge: false }>();

  // Same as the list: an event tied to a since-deleted company or job
  // disappears rather than showing a dangling reference.
  if (!event || event.company?.deleted_at || event.job?.deleted_at) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-5 px-4 py-8">
      <Link href="/events" className="text-[13.5px] text-navy hover:underline">
        ← Events
      </Link>

      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          {EVENT_TYPE_LABELS[event.type]}
        </p>
        <h1 className="mt-1 font-display text-[24px] leading-[1.25] font-semibold text-ink">
          {event.title}
        </h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-rule bg-surface">
        {[
          ["Starts", `${formatDateTimeIST(event.starts_at)} IST`],
          ["Ends", `${formatDateTimeIST(event.ends_at)} IST`],
          ...(event.company ? [["Company", event.company.name]] : []),
          ...(event.job ? [["Role", event.job.title]] : []),
          ...(event.venue ? [["Venue", event.venue]] : []),
        ].map(([label, value], i, arr) => (
          <div key={label}>
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <span className="text-[13px] text-slate">{label}</span>
              <span className="text-right text-[13.5px] font-medium text-ink">{value}</span>
            </div>
            {i < arr.length - 1 && <div className="h-px bg-rule" />}
          </div>
        ))}
      </div>

      {event.link && (
        <a
          href={event.link}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-lg bg-navy font-body text-[14px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Join link
        </a>
      )}

      <div className="flex flex-wrap gap-4 text-[13.5px] font-medium">
        <a
          href={googleCalendarUrl({
            title: event.title,
            startsAt: event.starts_at,
            endsAt: event.ends_at,
            location: event.venue,
          })}
          target="_blank"
          rel="noreferrer"
          className="text-navy hover:underline"
        >
          Add to Google Calendar
        </a>
        {event.company && (
          <Link href={`/companies/${event.company.id}`} className="text-navy hover:underline">
            View company
          </Link>
        )}
        {event.job && (
          <Link href={`/jobs/${event.job.id}`} className="text-navy hover:underline">
            View role
          </Link>
        )}
      </div>
    </main>
  );
}
