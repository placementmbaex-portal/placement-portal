import { Skeleton } from "@/components/skeleton";

export default function ApplicantsLoading() {
  return (
    <main className="flex flex-col gap-5">
      <Skeleton className="h-3 w-14 bg-rule" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 bg-rule" />
          <Skeleton className="h-3 w-72 bg-rule" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-44 rounded-md bg-rule" />
          <Skeleton className="h-10 w-36 rounded-md bg-rule" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b border-rule bg-paper text-slate">
            <tr>
              <th className="h-10 w-10 px-4" />
              <th className="h-10 px-2 font-medium">Name</th>
              <th className="h-10 px-2 font-medium">Roll no.</th>
              <th className="h-10 px-2 text-right font-medium">Exp.</th>
              <th className="h-10 px-2 font-medium">CV</th>
              <th className="h-10 px-2 font-medium">Applied</th>
              <th className="h-10 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="h-11 border-b border-rule last:border-0">
                <td className="px-4">
                  <Skeleton className="h-3.75 w-3.75 rounded-sm bg-rule" />
                </td>
                <td className="px-2">
                  <Skeleton className="h-3 w-28 bg-rule" />
                </td>
                <td className="px-2">
                  <Skeleton className="h-3 w-16 bg-rule" />
                </td>
                <td className="px-2 text-right">
                  <Skeleton className="ml-auto h-3 w-6 bg-rule" />
                </td>
                <td className="px-2">
                  <Skeleton className="h-3 w-20 bg-rule" />
                </td>
                <td className="px-2">
                  <Skeleton className="h-3 w-12 bg-rule" />
                </td>
                <td className="px-2">
                  <Skeleton className="h-[17px] w-20 rounded-[5px] bg-rule" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
