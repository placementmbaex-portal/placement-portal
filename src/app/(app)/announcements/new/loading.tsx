import { Skeleton } from "@/components/skeleton";

export default function NewAnnouncementLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-8">
      <Skeleton className="h-5 w-56 bg-rule" />
      <Skeleton className="h-3.5 w-full max-w-md bg-rule" />
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-10 w-full rounded-md bg-rule" />
        <Skeleton className="h-24 w-full rounded-md bg-rule" />
        <Skeleton className="h-10 w-full rounded-md bg-rule" />
        <Skeleton className="h-10 w-full rounded-md bg-rule" />
      </div>
    </main>
  );
}
