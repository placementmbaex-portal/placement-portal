import { Skeleton } from "@/components/skeleton";

function ApplicationCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2 bg-rule" />
          <Skeleton className="h-3 w-2/3 bg-rule" />
        </div>
        <Skeleton className="h-[17px] w-16 shrink-0 rounded-[5px] bg-rule" />
      </div>
      <Skeleton className="mt-3.5 h-1 w-full rounded-full bg-rule" />
      <Skeleton className="mt-3 h-3 w-3/4 bg-rule" />
    </div>
  );
}

export default function ApplicationsLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <Skeleton className="h-3 w-32 bg-rule" />
        <Skeleton className="mt-2.5 h-6 w-48 bg-rule" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
      </div>
    </main>
  );
}
