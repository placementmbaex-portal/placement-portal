import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCountdown,
  formatDateIST,
  formatDateTimeIST,
  formatShortDateIST,
  type ApplicationStatus,
} from "@/lib/format";
import { StatusTag, statusTagLabel } from "@/components/status-tag";
import { StatusHistory, type StatusHistoryEntry } from "@/components/status-history";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { withdrawApplication } from "@/app/(app)/jobs/[id]/actions";
import { viewCv } from "@/app/(app)/profile/actions";

const PIPELINE: { key: string; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "in_process", label: "In process" },
  { key: "offer", label: "Offer" },
];

// Five real values live in applications.status. There is no sixth
// "withdrawn" row to group in with Closed -- withdrawing deletes the
// application (schema.sql's guard_application comment: students withdraw
// by deleting their row, never by updating it), so a withdrawn
// application simply isn't in this list at all.
const ACTIVE_STATUSES = new Set(["applied", "shortlisted", "in_process"]);

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "in_process", label: "In process" },
  { key: "offer", label: "Offer" },
  { key: "not_selected", label: "Not selected" },
];

type ApplicationRow = {
  id: string;
  status: string;
  applied_at: string;
  cv: { id: string; label: string } | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    deadline: string | null;
    company: { name: string } | null;
  } | null;
};

type CvOption = { id: string; label: string };

function buildHref(
  current: { status?: string; cv?: string },
  overrides: { status?: string; cv?: string },
) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.cv) params.set("cv", next.cv);
  const qs = params.toString();
  return qs ? `/applications?${qs}` : "/applications";
}

function pillClass(active: boolean) {
  return `flex h-[34px] items-center rounded-full px-3.5 font-body text-[13px] ${
    active
      ? "bg-navy font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      : "border border-rule bg-surface font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
  }`;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cv?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { status: statusParam, cv: cvParam } = await searchParams;
  const activeStatus = STATUS_FILTERS.some((f) => f.key === statusParam) ? statusParam : undefined;

  const [{ data: applications }, { data: cvs }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, applied_at, cv:cvs(id, label), job:jobs(id, title, location, deadline, company:companies(name))",
      )
      .eq("student_id", user.id)
      .order("applied_at", { ascending: false })
      .overrideTypes<ApplicationRow[], { merge: false }>(),
    supabase
      .from("cvs")
      .select("id, label")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .overrideTypes<CvOption[], { merge: false }>(),
  ]);

  const applicationList = applications ?? [];
  const cvList = cvs ?? [];
  const activeCv = cvList.some((cv) => cv.id === cvParam) ? cvParam : undefined;

  const applicationIds = applicationList.map((a) => a.id);
  let historyRows: { application_id: string; to_status: string; changed_at: string }[] = [];
  if (applicationIds.length > 0) {
    const { data } = await supabase
      .from("application_status_history")
      .select("application_id, to_status, changed_at")
      .in("application_id", applicationIds)
      .order("changed_at", { ascending: true });
    historyRows = data ?? [];
  }

  const historyByApp = new Map<string, StatusHistoryEntry[]>();
  for (const application of applicationList) {
    historyByApp.set(application.id, [
      { label: statusTagLabel("applied"), date: formatShortDateIST(application.applied_at) },
    ]);
  }
  for (const row of historyRows) {
    const list = historyByApp.get(row.application_id);
    if (list) {
      list.push({
        label: statusTagLabel(row.to_status as ApplicationStatus),
        date: formatShortDateIST(row.changed_at),
      });
    }
  }

  const submittedCount = applicationList.length;
  const shortlistCount = applicationList.filter((a) => a.status === "shortlisted").length;
  const offerCount = applicationList.filter((a) => a.status === "offer").length;

  const filteredList = applicationList.filter((application) => {
    if (activeStatus && application.status !== activeStatus) return false;
    if (activeCv && application.cv?.id !== activeCv) return false;
    return true;
  });

  const activeList = filteredList.filter((a) => ACTIVE_STATUSES.has(a.status));
  const closedList = filteredList.filter((a) => !ACTIVE_STATUSES.has(a.status));
  const hasFilter = Boolean(activeStatus || activeCv);

  function renderCard(application: ApplicationRow) {
    const isNotSelected = application.status === "not_selected";
    const deadlinePassed = application.job?.deadline
      ? new Date(application.job.deadline) <= new Date()
      : false;
    const showWithdraw = !isNotSelected && !deadlinePassed;
    const stepIndex = PIPELINE.findIndex((step) => step.key === application.status);
    const showPipeline = stepIndex >= 0;
    const history = historyByApp.get(application.id) ?? [];

    return (
      <div
        key={application.id}
        className={`rounded-[14px] border border-rule bg-surface p-4 ${
          isNotSelected ? "opacity-[0.72]" : "shadow-[0_1px_3px_rgba(22,32,46,0.08)]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-[17px] leading-[1.35] font-semibold text-ink">
              {application.job?.company?.name}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] leading-[1.45] text-slate">
              {[application.job?.title, application.job?.location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0">
            <StatusTag status={application.status as ApplicationStatus} />
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

        <p className="mt-3 text-[12.5px] leading-[1.4] font-medium tabular-nums text-slate">
          {application.job?.deadline
            ? `${formatCountdown(application.job.deadline)} · ${formatDateTimeIST(application.job.deadline)} IST`
            : "No deadline"}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[12.5px] leading-[1.45] text-slate">
            Applied {formatDateIST(application.applied_at)}
          </p>
          {application.cv && (
            <form action={viewCv.bind(null, application.cv.id)}>
              <button
                type="submit"
                formTarget="_blank"
                className="text-[12.5px] font-medium text-navy underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                View {application.cv.label}
              </button>
            </form>
          )}
        </div>

        <StatusHistory entries={history} />

        {showWithdraw && (
          <form action={withdrawApplication.bind(null, application.id)} className="mt-2.5">
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
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          {submittedCount} submitted · {shortlistCount} shortlist{shortlistCount === 1 ? "" : "s"} ·{" "}
          {offerCount} offer{offerCount === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-[1.2] font-semibold text-ink">
          My applications
        </h1>

        {applicationList.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ status: activeStatus, cv: activeCv }, { status: undefined })}
                className={pillClass(!activeStatus)}
              >
                All statuses
              </Link>
              {STATUS_FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={buildHref({ status: activeStatus, cv: activeCv }, { status: f.key })}
                  className={pillClass(activeStatus === f.key)}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            {cvList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref({ status: activeStatus, cv: activeCv }, { cv: undefined })}
                  className={pillClass(!activeCv)}
                >
                  All CVs
                </Link>
                {cvList.map((cv) => (
                  <Link
                    key={cv.id}
                    href={buildHref({ status: activeStatus, cv: activeCv }, { cv: cv.id })}
                    className={pillClass(activeCv === cv.id)}
                  >
                    {cv.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 bg-scroll p-4">
        {applicationList.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            You haven&apos;t applied to anything yet.
          </p>
        ) : filteredList.length === 0 ? (
          <p className="text-[15px] leading-[1.55] text-slate">
            No applications match this filter.
          </p>
        ) : (
          <>
            {activeList.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">
                  Active
                </h2>
                {activeList.map(renderCard)}
              </section>
            )}
            {closedList.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">
                  Closed
                </h2>
                {closedList.map(renderCard)}
              </section>
            )}
          </>
        )}
        {hasFilter && filteredList.length > 0 && (
          <Link href="/applications" className="self-start text-[13px] text-navy">
            Clear filters
          </Link>
        )}
      </div>
    </main>
  );
}
