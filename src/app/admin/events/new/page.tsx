import { requireAdmin } from "@/lib/supabase/require-admin";
import { EventForm } from "../event-form";

type JobOption = {
  id: string;
  title: string;
  company: { name: string } | null;
};

export default async function NewEventPage() {
  const { supabase } = await requireAdmin();

  const [{ data: companies }, { data: jobs }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("jobs")
      .select("id, title, company:companies(name)")
      .order("title")
      .overrideTypes<JobOption[], { merge: false }>(),
  ]);

  const jobOptions = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    companyName: job.company?.name ?? "",
  }));

  return (
    <main>
      <EventForm companies={companies ?? []} jobs={jobOptions} />
    </main>
  );
}
