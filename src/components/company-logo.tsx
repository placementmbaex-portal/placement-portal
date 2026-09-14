const SIZE_CLASSES = {
  sm: { box: "h-10 w-10", text: "text-[13px]" },
  md: { box: "h-12 w-12", text: "text-[13.5px]" },
};

export function CompanyLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const { box, text } = SIZE_CLASSES[size];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URLs, not worth a remotePatterns allowlist
      <img
        src={logoUrl}
        alt=""
        className={`${box} shrink-0 rounded-md border border-rule object-contain`}
      />
    );
  }

  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-md border border-rule bg-paper ${text} font-medium text-slate`}
    >
      {initials}
    </div>
  );
}
