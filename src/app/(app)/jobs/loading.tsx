import { JobCardSkeleton, Skeleton } from "@/components/skeleton";

export default function JobsLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <Skeleton className="h-3 w-28 bg-rule" />
        <Skeleton className="mt-2.5 h-6 w-32 bg-rule" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-[34px] w-14 rounded-full bg-rule" />
          <Skeleton className="h-[34px] w-24 rounded-full bg-rule" />
          <Skeleton className="h-[34px] w-20 rounded-full bg-rule" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </main>
  );
}
