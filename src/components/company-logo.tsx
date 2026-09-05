export function CompanyLogo({
  name,
  logoUrl,
}: {
  name?: string | null;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URLs, not worth a remotePatterns allowlist
      <img
        src={logoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-md border border-rule object-contain"
      />
    );
  }

  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rule bg-paper text-[13.5px] font-medium text-slate">
      {initials}
    </div>
  );
}
