import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";

const SECTIONS = [
  {
    href: "/admin/settings/access",
    label: "Access",
    description: "Admins, the student roster, and who's on the sign-up allowlist.",
  },
  {
    href: "/admin/settings/profile-fields",
    label: "Profile fields",
    description: "The custom fields collected on every student's profile.",
  },
  {
    href: "/admin/settings/import",
    label: "Import",
    description: "Bulk-load student data from a spreadsheet.",
  },
  {
    href: "/admin/settings/notifications",
    label: "Notifications",
    description: "In-app, WhatsApp and email notification settings.",
  },
  {
    href: "/admin/settings/general",
    label: "General",
    description: "Portal URL, announcement defaults, and branding.",
  },
  {
    href: "/admin/settings/trash",
    label: "Trash",
    description: "Restore a soft-deleted company, role or announcement.",
  },
];

// This card list doubles as two different things: on mobile it's the
// entire "sub-nav becomes a list" screen DESIGN.md calls for (there's no
// sidebar there to fall back on); on desktop, where the sidebar is always
// visible too, it's just a helpful landing overview.
export default async function SettingsIndexPage() {
  await requireAdmin();

  return (
    <main className="flex flex-col gap-5">
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Setup, not daily work
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-rule bg-surface p-4 hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{section.label}</p>
            <p className="mt-1 text-[12.5px] leading-[1.45] text-slate">{section.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
