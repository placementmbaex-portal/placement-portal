import Link from "next/link";

export function AdminFormCard({
  title,
  subtitle,
  cancelHref,
  submitLabel,
  pendingLabel,
  pending,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  cancelHref: string;
  submitLabel: string;
  pendingLabel?: string;
  pending: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
      <div className="border-b border-rule bg-paper px-5.5 py-4.5">
        <h2 className="font-display text-[19px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.75 text-[12.5px] text-slate">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3.5 px-5.5 py-5">{children}</div>
      {error && <p className="px-5.5 pb-2 text-[13.5px] text-closing">{error}</p>}
      <div className="flex items-center justify-end gap-4.5 border-t border-rule bg-paper px-5.5 py-4">
        <Link href={cancelHref} className="text-[14px] text-slate hover:underline">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? (pendingLabel ?? "Saving…") : submitLabel}
        </button>
      </div>
    </div>
  );
}
