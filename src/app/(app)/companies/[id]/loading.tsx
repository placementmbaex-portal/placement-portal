import { JobCardSkeleton, Skeleton } from "@/components/skeleton";

export default function CompanyLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-md bg-rule" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 bg-rule" />
          <Skeleton className="h-3 w-24 bg-rule" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full bg-rule" />
        <Skeleton className="h-3.5 w-5/6 bg-rule" />
      </div>

      <section className="space-y-3">
        <Skeleton className="h-3.5 w-20 bg-rule" />
        <div className="flex flex-col gap-2.5">
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      </section>
    </main>
  );
}
