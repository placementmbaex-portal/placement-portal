import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { EventForm } from "../../event-form";
import { updateEvent } from "../../actions";

type JobOption = {
  id: string;
  title: string;
  company: { name: string } | null;
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const [{ data: event }, { data: companies }, { data: jobs }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, type, company_id, job_id, starts_at, ends_at, venue, link, visibility")
      .eq("id", id)
      .single(),
    supabase.from("companies").select("id, name").is("deleted_at", null).order("name"),
    supabase
      .from("jobs")
      .select("id, title, company:companies(name)")
      .is("deleted_at", null)
      .order("title")
      .overrideTypes<JobOption[], { merge: false }>(),
  ]);

  if (!event) notFound();

  const jobOptions = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    companyName: job.company?.name ?? "",
  }));

  let initialShortlistedCount: number | undefined;
  if (event.visibility === "shortlisted" && event.job_id) {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", event.job_id)
      .in("status", ["shortlisted", "in_process", "offer"]);
    initialShortlistedCount = count ?? 0;
  }

  return (
    <main>
      <EventForm
        action={updateEvent.bind(null, event.id)}
        companies={companies ?? []}
        jobs={jobOptions}
        defaultValues={event}
        initialShortlistedCount={initialShortlistedCount}
      />
    </main>
  );
}
