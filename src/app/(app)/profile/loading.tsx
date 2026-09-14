import { Skeleton } from "@/components/skeleton";

export default function ProfileLoading() {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <div className="bg-ink px-5 pt-4 pb-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full bg-white/20" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-white/20" />
            <Skeleton className="h-3 w-20 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-4.5">
        <Skeleton className="h-3 w-28 bg-rule" />
      </div>
      <div className="mt-2.5 flex flex-col gap-2 px-4">
        <Skeleton className="h-[68px] w-full rounded-xl bg-rule" />
        <Skeleton className="h-[68px] w-full rounded-xl bg-rule" />
      </div>

      <div className="px-5 pt-5.5">
        <Skeleton className="h-3 w-36 bg-rule" />
      </div>
      <Skeleton className="mt-2.5 mx-4 h-[124px] rounded-xl bg-rule" />

      <div className="px-5 pt-5">
        <Skeleton className="h-3 w-24 bg-rule" />
      </div>
      <div className="mt-2.5 space-y-3 px-5">
        <Skeleton className="h-11 w-full rounded-lg bg-rule" />
        <Skeleton className="h-11 w-full rounded-lg bg-rule" />
      </div>
    </main>
  );
}
