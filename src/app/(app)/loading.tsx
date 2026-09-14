import { AgendaRowSkeleton, JobCardSkeleton, Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-scroll pb-6">
      <div className="bg-surface px-5 pt-5 pb-4">
        <Skeleton className="h-3 w-36 bg-rule" />
        <Skeleton className="mt-2.5 h-6 w-52 bg-rule" />
      </div>

      <section className="px-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-24 bg-rule" />
          <Skeleton className="h-3 w-14 bg-rule" />
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      </section>

      <section className="px-4">
        <Skeleton className="h-4 w-20 bg-rule" />
        <div className="mt-2.5 divide-y divide-rule overflow-hidden rounded-[14px] border border-rule bg-surface">
          <AgendaRowSkeleton />
          <AgendaRowSkeleton />
          <AgendaRowSkeleton />
        </div>
      </section>
    </main>
  );
}
