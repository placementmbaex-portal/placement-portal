import type { ChipStyle } from "@/lib/chips";

export function Chip({ style }: { style: ChipStyle }) {
  return (
    <span
      className="rounded-[5px] px-[7px] py-1 font-body text-[10px] font-bold tracking-[0.07em] uppercase"
      style={{ background: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
