import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST, formatRelativeTime } from "@/lib/format";
import { AdminToggle } from "./admin-toggle";
import { AddAllowlistForm, BulkAddAllowlistForm, RemoveAllowlistButton } from "./allowlist-forms";

type ActivityRow = {
  student_id: string;
  email: string;
  name: string;
  roll_no: string | null;
  is_admin: boolean;
  last_sign_in_at: string | null;
  account_created: string | null;
  cv_count: number;
  application_count: number;
};

type NeverSignedInRow = { email: string; name: string; roll_no: string | null };

type AllowedStudentRow = {
  email: string;
  name: string;
  roll_no: string | null;
  total_experience_years: number | null;
};

type Filter = "all" | "no_cv" | "not_applied";
type SortField = "name" | "last_sign_in" | "cv_count" | "application_count";
const SORT_FIELDS: SortField[] = ["name", "last_sign_in", "cv_count", "application_count"];

function buildHref(params: URLSearchParams, overrides: Record<string, string | undefined>) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/admin/settings/access?${qs}` : "/admin/settings/access";
}

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; sort?: string; dir?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { filter: filterParam, q, sort: sortParam, dir: dirParam } = await searchParams;

  const filter: Filter = ["no_cv", "not_applied"].includes(filterParam ?? "")
    ? (filterParam as Filter)
    : "all";
  const query = (q ?? "").trim().toLowerCase();
  const sort: SortField = SORT_FIELDS.includes(sortParam as SortField)
    ? (sortParam as SortField)
    : "last_sign_in";
  const dir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";

  const currentParams = new URLSearchParams();
  if (filter !== "all") currentParams.set("filter", filter);
  if (query) currentParams.set("q", query);
  if (sortParam) currentParams.set("sort", sortParam);
  if (dirParam) currentParams.set("dir", dirParam);

  const [{ data: activityData }, { data: neverSignedInData }, { data: allowed }] =
    await Promise.all([
      supabase.rpc("admin_user_activity"),
      supabase.rpc("admin_never_signed_in"),
      supabase
        .from("allowed_students")
        .select("email, name, roll_no, total_experience_years")
        .order("name")
        .overrideTypes<AllowedStudentRow[], { merge: false }>(),
    ]);

  const activity = activityData as ActivityRow[] | null;
  const neverSignedIn = neverSignedInData as NeverSignedInRow[] | null;

  const all = activity ?? [];
  const noCvCount = all.filter((s) => Number(s.cv_count) === 0).length;
  const notAppliedCount = all.filter((s) => Number(s.application_count) === 0).length;
  const adminCount = all.filter((s) => s.is_admin).length;

  const filtered = all.filter((s) => {
    if (filter === "no_cv" && Number(s.cv_count) > 0) return false;
    if (filter === "not_applied" && Number(s.application_count) > 0) return false;
    if (query) {
      const haystack = `${s.name} ${s.roll_no ?? ""} ${s.email}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "cv_count":
        cmp = Number(a.cv_count) - Number(b.cv_count);
        break;
      case "application_count":
        cmp = Number(a.application_count) - Number(b.application_count);
        break;
      case "last_sign_in": {
        const at = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : -Infinity;
        const bt = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : -Infinity;
        cmp = at - bt;
        break;
      }
    }
    return dir === "asc" ? cmp : -cmp;
  });

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "no_cv", label: "No CV", count: noCvCount },
    { key: "not_applied", label: "Not applied", count: notAppliedCount },
  ];

  function sortHeader(field: SortField, label: string, align: "left" | "right" = "left") {
    const active = sort === field;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const href = buildHref(currentParams, { sort: field, dir: nextDir });
    return (
      <th className={`h-10 px-4 font-medium ${align === "right" ? "text-right" : ""}`}>
        <Link
          href={href}
          className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {label}
          {active ? (dir === "asc" ? " ▲" : " ▼") : ""}
        </Link>
      </th>
    );
  }

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {all.length} registered · {adminCount} admin{adminCount === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Access
          </h1>
        </div>

        <form className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Link
                key={f.key}
                href={buildHref(currentParams, { filter: f.key === "all" ? undefined : f.key })}
                className={`flex h-11 items-center rounded-lg px-3.5 font-body text-[12.5px] sm:h-[34px] ${
                  active
                    ? "bg-ink font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    : "border border-rule bg-surface font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                }`}
              >
                {f.label} {f.count}
              </Link>
            );
          })}
          <span className="flex-1" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, roll no or email…"
            aria-label="Search name, roll no or email"
            className="h-11 w-full rounded-lg border border-rule px-3 text-[12.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink sm:h-[34px] sm:w-[240px]"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {sortParam && <input type="hidden" name="sort" value={sortParam} />}
          {dirParam && <input type="hidden" name="dir" value={dirParam} />}
        </form>

        {sorted.length === 0 ? (
          <p className="text-[14px] text-slate">No students match.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-rule bg-paper text-slate">
                  <tr>
                    {sortHeader("name", "Name")}
                    <th className="h-10 px-4 font-medium">Roll no.</th>
                    <th className="h-10 px-4 font-medium">Email</th>
                    <th className="h-10 px-4 text-center font-medium">Admin</th>
                    {sortHeader("last_sign_in", "Last sign-in")}
                    {sortHeader("cv_count", "CVs", "right")}
                    {sortHeader("application_count", "Applications", "right")}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((student) => (
                    <tr key={student.student_id} className="h-11 border-b border-rule last:border-0">
                      <td className="px-4 font-medium text-ink">{student.name}</td>
                      <td className="px-4 tabular-nums text-slate">{student.roll_no ?? "—"}</td>
                      <td className="px-4 text-slate">{student.email}</td>
                      <td className="px-4 text-center">
                        <AdminToggle
                          studentId={student.student_id}
                          studentName={student.name}
                          isAdmin={student.is_admin}
                        />
                      </td>
                      <td className="px-4 whitespace-nowrap tabular-nums text-slate">
                        {student.last_sign_in_at ? (
                          <span title={formatDateTimeIST(student.last_sign_in_at) + " IST"}>
                            {formatRelativeTime(student.last_sign_in_at)} ·{" "}
                            {formatDateTimeIST(student.last_sign_in_at)} IST
                          </span>
                        ) : (
                          <span className="font-medium text-shut">Never</span>
                        )}
                      </td>
                      <td className="px-4 text-right tabular-nums text-ink">
                        {Number(student.cv_count)}
                      </td>
                      <td className="px-4 text-right tabular-nums text-ink">
                        {Number(student.application_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2.5 sm:hidden">
              {sorted.map((student) => (
                <div key={student.student_id} className="rounded-[14px] border border-rule bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px] font-semibold text-ink">
                        {student.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-slate">{student.email}</p>
                    </div>
                    <AdminToggle
                      studentId={student.student_id}
                      studentName={student.name}
                      isAdmin={student.is_admin}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-slate">
                    <span>{student.roll_no ?? "No roll no."}</span>
                    <span>
                      {Number(student.cv_count)} CV{Number(student.cv_count) === 1 ? "" : "s"}
                    </span>
                    <span>
                      {Number(student.application_count)} application
                      {Number(student.application_count) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-slate">
                    {student.last_sign_in_at ? (
                      <>
                        Signed in {formatRelativeTime(student.last_sign_in_at)} ·{" "}
                        {formatDateTimeIST(student.last_sign_in_at)} IST
                      </>
                    ) : (
                      <span className="font-medium text-shut">Never signed in</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {(neverSignedIn ?? []).length} waiting
          </p>
          <h2 className="mt-1 font-display text-[19px] font-semibold text-ink">
            Not yet signed in
          </h2>
          <p className="mt-1 text-[13px] leading-[1.5] text-slate">
            On the allowlist, but no account yet — worth a nudge from the committee.
          </p>
        </div>
        {(neverSignedIn ?? []).length === 0 ? (
          <p className="text-[14px] text-slate">Everyone on the allowlist has signed in.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-rule bg-surface">
            {(neverSignedIn ?? []).map((row, i, arr) => (
              <div key={row.email}>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{row.name}</p>
                    <p className="truncate text-[12px] text-slate">
                      {row.email}
                      {row.roll_no ? ` · ${row.roll_no}` : ""}
                    </p>
                  </div>
                  <RemoveAllowlistButton email={row.email} />
                </div>
                {i < arr.length - 1 && <div className="h-px bg-rule" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {(allowed ?? []).length} on the list
          </p>
          <h2 className="mt-1 font-display text-[19px] font-semibold text-ink">Allowlist</h2>
          <p className="mt-1 text-[13px] leading-[1.5] text-slate">
            Only an email on this list can create an account. Adding one here doesn&apos;t
            create a student — that happens on their own first sign-in.
          </p>
        </div>

        <AddAllowlistForm />
        <BulkAddAllowlistForm />

        {(allowed ?? []).length > 0 && (
          <div className="overflow-hidden rounded-lg border border-rule bg-surface">
            {(allowed ?? []).map((row, i, arr) => (
              <div key={row.email}>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{row.name}</p>
                    <p className="truncate text-[12px] text-slate">
                      {row.email}
                      {row.roll_no ? ` · ${row.roll_no}` : ""}
                      {row.total_experience_years != null
                        ? ` · ${row.total_experience_years} yrs`
                        : ""}
                    </p>
                  </div>
                  <RemoveAllowlistButton email={row.email} />
                </div>
                {i < arr.length - 1 && <div className="h-px bg-rule" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
