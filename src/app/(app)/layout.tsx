import Image from "next/image";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-brown">
      <div className="hidden items-center gap-3 pt-[30px] pb-[22px] md:flex">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper">
          <Image
            src="/logo-iimc.svg"
            alt="IIM Calcutta"
            width={30}
            height={30}
            className="h-[30px] w-[30px] object-contain"
          />
        </span>
        <span className="h-6 w-px bg-white/28" />
        <span className="font-body text-[17px] font-bold text-white">
          MBA<span className="text-flame">Ex</span>
        </span>
        <span className="font-body text-[13px] uppercase tracking-[0.16em] text-white/60">
          Placements
        </span>
      </div>

      <div className="flex w-full max-w-[390px] flex-1 flex-col bg-paper md:rounded-t-[20px] md:shadow-[0_-2px_40px_rgba(0,0,0,0.28)]">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
