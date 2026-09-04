import Link from "next/link";
import { formatCountdown, formatDateTimeIST } from "@/lib/format";

type JobCardJob = {
  id: string;
  title: string;
  location: string | null;
  deadline: string | null;
};

export function JobCard({
  job,
  companyName,
  applied,
  hideCompany = false,
}: {
  job: JobCardJob;
  companyName?: string | null;
  applied: boolean;
  hideCompany?: boolean;
}) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!hideCompany && companyName && (
            <p className="truncate text-xs font-medium text-zinc-500">
              {companyName}
            </p>
          )}
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {job.title}
          </h3>
          {job.location && (
            <p className="text-xs text-zinc-500">{job.location}</p>
          )}
        </div>
        {applied && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            Applied
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        {job.deadline ? (
          <>
            <span>{formatDateTimeIST(job.deadline)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatCountdown(job.deadline)}</span>
          </>
        ) : (
          <span>No deadline</span>
        )}
      </div>
    </Link>
  );
}
