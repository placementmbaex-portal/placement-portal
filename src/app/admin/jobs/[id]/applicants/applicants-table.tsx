"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { formatDateIST, formatDateTimeIST } from "@/lib/format";
import { applicationStatusChip } from "@/lib/chips";
import { Chip } from "@/components/chip";
import { viewApplicantCv, bulkUpdateStatus, type BulkStatusState } from "./actions";

const initialState: BulkStatusState = null;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "in_process", label: "In process" },
  { value: "offer", label: "Offer" },
  { value: "not_selected", label: "Not selected" },
];

type ApplicantRow = {
  id: string;
  applied_at: string;
  status: string;
  status_changed_at: string;
  cv: { label: string; file_path: string } | null;
  student: {
    name: string;
    roll_no: string | null;
    total_experience_years: number | null;
  } | null;
};

type SortField = "name" | "applied";

export function ApplicantsTable({
  jobId,
  applicants,
  sort,
  dir,
}: {
  jobId: string;
  applicants: ApplicantRow[];
  sort: SortField;
  dir: "asc" | "desc";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [state, action, pending] = useActionState(
    bulkUpdateStatus.bind(null, jobId),
    initialState,
  );

  function sortHref(field: SortField) {
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    return `?sort=${field}&dir=${nextDir}`;
  }

  function sortIndicator(field: SortField) {
    if (sort !== field) return null;
    return dir === "asc" ? " ▲" : " ▼";
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allChecked = applicants.length > 0 && selected.size === applicants.length;

  return (
    <form action={action}>
      {selected.size > 0 && (
        <div className="mb-3.5 flex flex-wrap items-center gap-4 rounded-lg bg-ink px-4.5 py-3.5">
          <span className="font-body text-[13.5px] font-medium text-white tabular-nums">
            {selected.size} selected
          </span>
          <span className="h-5.5 w-px bg-white/22" />
          <span className="flex items-center gap-2">
            <span className="text-[12.5px] text-white/70">Set status to</span>
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-white/28 bg-white/14 px-2.5 font-body text-[12.5px] font-medium text-white"
            >
              <option value="" className="text-ink">
                Choose…
              </option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="text-ink">
                  {option.label}
                </option>
              ))}
            </select>
          </span>
          <button
            type="submit"
            disabled={pending || !status}
            className="flex h-8 items-center rounded-md bg-white px-3.5 font-body text-[12.5px] font-semibold text-ink disabled:opacity-60"
          >
            {pending ? "Applying…" : `Apply to ${selected.size}`}
          </button>
          <span className="flex-1" />
          <a
            href={`/admin/jobs/${jobId}/applicants/cvs?ids=${Array.from(selected).join(",")}`}
            className="flex items-center gap-2 rounded-md bg-flame px-3.5 py-2 font-body text-[12.5px] font-semibold text-white"
          >
            Download {selected.size} CVs as .zip
          </a>
        </div>
      )}
      {state?.error && (
        <p className="mb-3 text-[13.5px] text-closing">{state.error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b border-rule bg-paper text-slate">
            <tr>
              <th className="h-10 w-10 px-4">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(applicants.map((a) => a.id)) : new Set())
                  }
                  aria-label="Select all"
                  className="h-3.75 w-3.75"
                />
              </th>
              <th className="h-10 px-2 font-medium">
                <Link href={sortHref("name")} className="hover:underline">
                  Name{sortIndicator("name")}
                </Link>
              </th>
              <th className="h-10 px-2 font-medium">Roll no.</th>
              <th className="h-10 px-2 text-right font-medium">Exp.</th>
              <th className="h-10 px-2 font-medium">CV</th>
              <th className="h-10 px-2 font-medium">
                <Link href={sortHref("applied")} className="hover:underline">
                  Applied{sortIndicator("applied")}
                </Link>
              </th>
              <th className="h-10 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((application) => {
              const isSelected = selected.has(application.id);
              return (
                <tr
                  key={application.id}
                  className={`h-11 border-b border-rule last:border-0 ${isSelected ? "bg-[#F5F8FB]" : ""}`}
                >
                  <td className="px-4">
                    <input
                      type="checkbox"
                      name="application_ids"
                      value={application.id}
                      checked={isSelected}
                      onChange={(e) => toggle(application.id, e.target.checked)}
                      aria-label={`Select ${application.student?.name ?? "applicant"}`}
                      className="h-3.75 w-3.75"
                    />
                  </td>
                  <td className="px-2 font-medium text-ink">{application.student?.name}</td>
                  <td className="px-2 tabular-nums text-slate">
                    {application.student?.roll_no ?? "—"}
                  </td>
                  <td className="px-2 text-right tabular-nums text-ink">
                    {application.student?.total_experience_years != null
                      ? application.student.total_experience_years
                      : "—"}
                  </td>
                  <td className="px-2 text-navy">
                    {application.cv?.file_path ? (
                      <form action={viewApplicantCv.bind(null, jobId, application.cv.file_path)} className="inline">
                        <button type="submit" formTarget="_blank" className="hover:underline">
                          {application.cv.label}
                        </button>
                      </form>
                    ) : (
                      <span className="text-slate">—</span>
                    )}
                  </td>
                  <td className="px-2 whitespace-nowrap tabular-nums text-slate">
                    {formatDateIST(application.applied_at)}
                  </td>
                  <td
                    className="px-2 whitespace-nowrap"
                    title={`Updated ${formatDateTimeIST(application.status_changed_at)}`}
                  >
                    <Chip style={applicationStatusChip(application.status)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
