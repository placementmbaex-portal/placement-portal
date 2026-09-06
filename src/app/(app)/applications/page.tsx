import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST } from "@/lib/format";
import { applicationStatusChip } from "@/lib/chips";
import { Chip } from "@/components/chip";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { withdrawApplication } from "@/app/(app)/jobs/[id]/actions";

const PIPELINE: { key: string; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "in_process", label: "In process" },
  { key: "offer", label: "Offer" },
];

type ApplicationRow = {
  id: string;
  status: string;
  applied_at: string;
  status_changed_at: string;
  cv: { label: string } | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    deadline: string | null;
    company: { name: string } | null;
  } | null;
};

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, status_changed_at, cv:cvs(label), job:jobs(id, title, location, deadline, company:companies(name))",
    )
    .eq("student_id", user.id)
    .order("applied_at", { ascending: false })
    .overrideTypes<ApplicationRow[], { merge: false }>();

  const applicationList = applications ?? [];
  const liveCount = applicationList.filter((a) =>
    ["applied", "shortlisted", "in_process"].includes(a.status),
  ).length;
  const offerCount = applicationList.filter((a) => a.status === "offer").length;

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          {liveCount} live · {offerCount} offer{offerCount === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
          My applications
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        {applicationList.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            You haven&apos;t applied to anything yet.
          </p>
        ) : (
          applicationList.map((application) => {
            const chip = applicationStatusChip(application.status);
            const stepIndex = PIPELINE.findIndex(
              (step) => step.key === application.status,
            );
            const showPipeline = stepIndex >= 0;
            const isNotSelected = application.status === "not_selected";
            const deadlinePassed = application.job?.deadline
              ? new Date(application.job.deadline) <= new Date()
              : false;
            const showWithdraw = !isNotSelected && !deadlinePassed;

            return (
              <div
                key={application.id}
                className={`rounded-[14px] border border-rule bg-surface p-4 ${
                  isNotSelected
                    ? "opacity-[0.72]"
                    : "shadow-[0_1px_3px_rgba(22,32,46,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[17px] leading-[1.35] font-semibold text-ink">
                      {application.job?.company?.name}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] leading-[1.45] text-slate">
                      {[application.job?.title, application.job?.location]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Chip style={chip} />
                  </div>
                </div>

                {showPipeline && (
                  <>
                    <div className="mt-3.5 flex items-center gap-1.5">
                      {PIPELINE.map((step, i) => (
                        <span
                          key={step.key}
                          className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-live" : "bg-rule"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between">
                      {PIPELINE.map((step, i) => (
                        <span
                          key={step.key}
                          className={`text-[10px] ${i <= stepIndex ? "text-live" : "text-shut"}`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <p className="mt-3 text-[12.5px] leading-[1.45] text-slate">
                  {application.cv?.label} · applied{" "}
                  {formatDateIST(application.applied_at)} · updated{" "}
                  {formatDateIST(application.status_changed_at)}
                </p>

                {showWithdraw && (
                  <form
                    action={withdrawApplication.bind(null, application.id)}
                    className="mt-2.5"
                  >
                    <ConfirmSubmitButton
                      confirmMessage="Withdraw this application? This cannot be undone."
                      pendingLabel="Withdrawing…"
                      className="text-[13.5px] font-medium text-closing underline underline-offset-2 disabled:opacity-60"
                    >
                      Withdraw
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
