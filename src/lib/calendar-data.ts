import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEntry, EventType } from "@/lib/calendar";

type DeadlineJob = {
  id: string;
  title: string;
  deadline: string;
  company: { name: string } | null;
};

type EventRow = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  link: string | null;
  job_id: string | null;
  company: { name: string; deleted_at: string | null } | null;
  job: { deleted_at: string | null } | null;
};

// Shared by /events and the dashboard's "This week" card. Job deadlines
// are queried live from jobs.deadline (never a stored copy — see the
// events table's own comment in schema.sql), merged with admin-created
// events the RLS policy already scopes to what this viewer may see.
export async function getCalendarEntries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  startUtc: string,
  endUtc: string,
): Promise<CalendarEntry[]> {
  const [{ data: deadlineJobs }, { data: events }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, deadline, company:companies(name)")
      .is("deleted_at", null)
      .not("deadline", "is", null)
      .gte("deadline", startUtc)
      .lt("deadline", endUtc)
      .overrideTypes<DeadlineJob[], { merge: false }>(),
    supabase
      .from("events")
      .select(
        "id, title, type, starts_at, ends_at, venue, link, job_id, company:companies(name, deleted_at), job:jobs(deleted_at)",
      )
      .gte("starts_at", startUtc)
      .lt("starts_at", endUtc)
      .overrideTypes<EventRow[], { merge: false }>(),
  ]);

  // Events aren't soft-deletable themselves, but one tied to a job or
  // company that now is should disappear the same way the deadline entry
  // above already does -- otherwise "linked events will be hidden" in the
  // delete confirmation would be a lie for anyone whose RLS grants (i.e.
  // an admin) would otherwise still show it.
  const liveEvents = (events ?? []).filter(
    (event) => !event.job?.deleted_at && !event.company?.deleted_at,
  );

  const deadlineEntries: CalendarEntry[] = (deadlineJobs ?? []).map((job) => ({
    id: `deadline-${job.id}`,
    type: "deadline",
    title: job.title,
    startsAt: job.deadline,
    endsAt: job.deadline,
    venue: null,
    link: null,
    companyName: job.company?.name ?? null,
    jobId: job.id,
  }));

  const eventEntries: CalendarEntry[] = liveEvents.map((event) => ({
    id: event.id,
    type: event.type as EventType,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    venue: event.venue,
    link: event.link,
    companyName: event.company?.name ?? null,
    jobId: event.job_id,
  }));

  return [...deadlineEntries, ...eventEntries].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
