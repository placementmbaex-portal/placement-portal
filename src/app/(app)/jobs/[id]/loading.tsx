import { Skeleton } from "@/components/skeleton";

export default function JobDetailLoading() {
  return (
    <main className="flex flex-1 flex-col gap-5 pb-8">
      <div className="border-b border-rule bg-surface px-5 pt-1.5 pb-4.5">
        <Skeleton className="h-3 w-24 bg-rule" />
        <div className="mt-2.5 flex items-start gap-3.5">
          <Skeleton className="h-12 w-12 shrink-0 rounded-md bg-rule" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 bg-rule" />
            <Skeleton className="h-3 w-1/2 bg-rule" />
          </div>
        </div>
        <Skeleton className="mt-3.5 h-8 w-52 rounded-lg bg-rule" />
      </div>

      <div className="flex gap-2.5 px-5">
        <Skeleton className="h-14 flex-1 rounded-[10px] bg-rule" />
        <Skeleton className="h-14 flex-1 rounded-[10px] bg-rule" />
      </div>

      <div className="space-y-2 px-5">
        <Skeleton className="h-3.5 w-full bg-rule" />
        <Skeleton className="h-3.5 w-full bg-rule" />
        <Skeleton className="h-3.5 w-2/3 bg-rule" />
      </div>

      <div className="px-5">
        <Skeleton className="h-11 w-full rounded-lg bg-rule" />
      </div>
    </main>
  );
}
