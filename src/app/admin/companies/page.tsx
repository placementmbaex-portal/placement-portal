import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";

export default async function AdminCompaniesPage() {
  const { supabase } = await requireAdmin();

  const [{ data: companies }, { data: jobs }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, sector, is_legacy_recruiter")
      .order("name"),
    supabase.from("jobs").select("company_id"),
  ]);

  const jobCounts = new Map<string, number>();
  for (const job of jobs ?? []) {
    jobCounts.set(job.company_id, (jobCounts.get(job.company_id) ?? 0) + 1);
  }

  const companyList = companies ?? [];

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            {companyList.length} companies
          </p>
          <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
            Companies
          </h1>
        </div>
        <Link
          href="/admin/companies/new"
          className="flex h-11 items-center rounded-lg bg-navy px-4.5 font-body text-[14px] font-semibold text-white sm:h-10"
        >
          Add a company
        </Link>
      </div>

      {companyList.length === 0 ? (
        <p className="text-[14px] text-slate">No companies yet.</p>
      ) : (
        <>
          {/* Table -- desktop and wider tablets only; below 640px a stacked
              card list replaces it rather than forcing horizontal scroll. */}
          <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-rule bg-paper text-slate">
                <tr>
                  <th className="h-10 px-4 font-medium">Name</th>
                  <th className="h-10 px-4 font-medium">Sector</th>
                  <th className="h-10 px-4 text-right font-medium">Jobs</th>
                  <th className="h-10 px-4 font-medium">Legacy</th>
                  <th className="h-10 px-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {companyList.map((company) => (
                  <tr key={company.id} className="h-11 border-b border-rule last:border-0">
                    <td className="px-4 font-medium text-ink">{company.name}</td>
                    <td className="px-4 text-slate">{company.sector ?? "—"}</td>
                    <td className="px-4 text-right tabular-nums text-ink">
                      {jobCounts.get(company.id) ?? 0}
                    </td>
                    <td className="px-4 text-slate">
                      {company.is_legacy_recruiter ? "Yes" : "—"}
                    </td>
                    <td className="px-4 text-right">
                      <Link href={`/admin/companies/${company.id}/edit`} className="text-navy">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            {companyList.map((company) => (
              <div key={company.id} className="rounded-[14px] border border-rule bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-display text-[15px] font-semibold text-ink">
                    {company.name}
                  </p>
                  <Link
                    href={`/admin/companies/${company.id}/edit`}
                    className="-mr-2 -mt-1.5 flex h-11 shrink-0 items-center px-2 font-body text-[13px] font-medium text-navy"
                  >
                    Edit
                  </Link>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-slate">
                  <span>{company.sector ?? "No sector"}</span>
                  <span>
                    {jobCounts.get(company.id) ?? 0} job
                    {(jobCounts.get(company.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                  {company.is_legacy_recruiter && <span>Legacy recruiter</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
