import { AnnouncementCardSkeleton, Skeleton } from "@/components/skeleton";

export default function AnnouncementsLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule bg-surface px-5 pt-2 pb-4">
        <Skeleton className="h-3 w-20 bg-rule" />
        <Skeleton className="mt-2.5 h-6 w-44 bg-rule" />
        <Skeleton className="mt-4 h-11 w-full rounded-lg bg-rule" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 bg-scroll p-4">
        <AnnouncementCardSkeleton />
        <AnnouncementCardSkeleton />
        <AnnouncementCardSkeleton />
      </div>
    </main>
  );
}
