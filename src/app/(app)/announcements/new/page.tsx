import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "@/components/announcement-form";
import { createAnnouncement } from "@/lib/announcements/actions";

type JobOption = {
  id: string;
  title: string;
  company: { name: string } | null;
};

export default async function NewAnnouncementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
        Submit an announcement
      </h1>
      <p className="text-[15px] leading-[1.55] text-slate">
        An admin reviews submissions before they appear on the dashboard.
      </p>
      <AnnouncementForm
        action={createAnnouncement}
        companies={companies ?? []}
        jobs={jobOptions}
      />
    </main>
  );
}
