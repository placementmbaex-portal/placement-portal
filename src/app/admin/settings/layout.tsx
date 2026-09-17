import { SettingsSidebar } from "@/components/settings-sidebar";

// Setup tasks, used once or occasionally -- this section deliberately
// looks different from the daily-work pages: a sub-nav of its own inside
// the content area, not competing with the main sidebar's five items.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
      <SettingsSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
