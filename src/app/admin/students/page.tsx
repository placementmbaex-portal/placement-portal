import { requireAdmin } from "@/lib/supabase/require-admin";

type StudentRow = {
  id: string;
  name: string;
  roll_no: string | null;
  total_experience_years: number | null;
};

type Filter = "all" | "no_cv" | "not_applied";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { filter: filterParam, q } = await searchParams;
  const filter: Filter = ["no_cv", "not_applied"].includes(filterParam ?? "")
    ? (filterParam as Filter)
    : "all";
  const query = (q ?? "").trim().toLowerCase();

  const [{ data: students }, { data: cvs }, { data: applications }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, roll_no, total_experience_years")
      .order("name")
      .overrideTypes<StudentRow[], { merge: false }>(),
    supabase.from("cvs").select("student_id"),
    supabase.from("applications").select("student_id"),
  ]);

  const cvCounts = new Map<string, number>();
  for (const cv of cvs ?? []) {
    cvCounts.set(cv.student_id, (cvCounts.get(cv.student_id) ?? 0) + 1);
  }
  const applicationCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicationCounts.set(
      application.student_id,
      (applicationCounts.get(application.student_id) ?? 0) + 1,
    );
  }

  const all = students ?? [];
  const noCvCount = all.filter((s) => (cvCounts.get(s.id) ?? 0) === 0).length;
  const notAppliedCount = all.filter((s) => (applicationCounts.get(s.id) ?? 0) === 0).length;

  const filtered = all.filter((s) => {
    if (filter === "no_cv" && (cvCounts.get(s.id) ?? 0) > 0) return false;
    if (filter === "not_applied" && (applicationCounts.get(s.id) ?? 0) > 0) return false;
    if (query) {
      const haystack = `${s.name} ${s.roll_no ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "no_cv", label: "No CV", count: noCvCount },
    { key: "not_applied", label: "Not applied", count: notAppliedCount },
  ];

  return (
    <main className="flex flex-col gap-5">
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          {all.length} registered
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Students
        </h1>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <a
              key={f.key}
              href={f.key === "all" ? "/admin/students" : `/admin/students?filter=${f.key}`}
              className={`flex h-[34px] items-center rounded-lg px-3.5 font-body text-[12.5px] ${
                active
                  ? "bg-ink font-semibold text-white"
                  : "border border-rule bg-surface font-medium text-ink"
              }`}
            >
              {f.label} {f.count}
            </a>
          );
        })}
        <span className="flex-1" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or roll no…"
          className="h-[34px] w-[200px] rounded-lg border border-rule px-3 text-[12.5px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      </form>

      {filtered.length === 0 ? (
        <p className="text-[14px] text-slate">No students match.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-rule bg-paper text-slate">
              <tr>
                <th className="h-10 px-4 font-medium">Name</th>
                <th className="h-10 px-4 font-medium">Roll no.</th>
                <th className="h-10 px-4 text-right font-medium">Exp.</th>
                <th className="h-10 px-4 text-right font-medium">CVs</th>
                <th className="h-10 px-4 text-right font-medium">Applications</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} className="h-11 border-b border-rule last:border-0">
                  <td className="px-4 font-medium text-ink">{student.name}</td>
                  <td className="px-4 tabular-nums text-slate">{student.roll_no ?? "—"}</td>
                  <td className="px-4 text-right tabular-nums text-ink">
                    {student.total_experience_years ?? "—"}
                  </td>
                  <td className="px-4 text-right tabular-nums text-ink">
                    {cvCounts.get(student.id) ?? 0}
                  </td>
                  <td className="px-4 text-right tabular-nums text-ink">
                    {applicationCounts.get(student.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-shut">
        &ldquo;Last opened&rdquo; and active/dormant status need a last-seen timestamp not yet
        collected. The allowlist itself is seeded from CSV before launch, not managed here.
      </p>
    </main>
  );
}
