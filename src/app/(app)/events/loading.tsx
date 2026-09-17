import { AgendaRowSkeleton, Skeleton } from "@/components/skeleton";

export default function EventsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 bg-rule" />
          <Skeleton className="h-6 w-24 bg-rule" />
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-32 bg-rule" />
          <div className="flex shrink-0 gap-1.5">
            <Skeleton className="h-9 w-9 rounded-lg bg-rule" />
            <Skeleton className="h-9 w-9 rounded-lg bg-rule" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden border border-rule bg-rule">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[104px] bg-surface p-2">
              <Skeleton className="h-3 w-4 bg-rule" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 md:hidden">
        <AgendaRowSkeleton />
        <AgendaRowSkeleton />
        <AgendaRowSkeleton />
      </div>
    </main>
  );
}
