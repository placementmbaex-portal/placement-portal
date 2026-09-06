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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Companies
        </h1>
        <Link
          href="/admin/companies/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create company
        </Link>
      </div>

      {companyList.length === 0 ? (
        <p className="text-sm text-zinc-500">No companies yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Sector</th>
                <th className="px-3 py-2 font-medium">Jobs</th>
                <th className="px-3 py-2 font-medium">Legacy</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {companyList.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {company.name}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {company.sector ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {jobCounts.get(company.id) ?? 0}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {company.is_legacy_recruiter ? "Yes" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/companies/${company.id}/edit`}
                      className="text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
