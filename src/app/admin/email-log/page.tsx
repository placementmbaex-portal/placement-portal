import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { SettingsSubNav } from "@/components/settings-subnav";

type EmailLogRow = {
  id: string;
  to_email: string;
  subject: string | null;
  status: string;
  mode: string | null;
  error: string | null;
  created_at: string;
  intended: { name: string; email: string } | null;
};

const STATUS_TEXT: Record<string, string> = {
  sent: "text-live",
  suppressed: "text-slate",
  failed: "text-closing",
};

const LIMIT = 200;

export default async function EmailLogPage() {
  const { supabase } = await requireAdmin();

  const { data: rows } = await supabase
    .from("email_log")
    .select("id, to_email, subject, status, mode, error, created_at, intended:students!intended_for(name, email)")
    .order("created_at", { ascending: false })
    .limit(LIMIT)
    .overrideTypes<EmailLogRow[], { merge: false }>();

  const logRows = rows ?? [];

  return (
    <main className="flex flex-col gap-5">
      <SettingsSubNav />
      <div>
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Last {logRows.length} sends
        </p>
        <h1 className="mt-1 font-display text-[28px] leading-[1.2] font-semibold text-ink">
          Email log
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-slate">
          Every email attempt, whichever mode it ran under. In test mode, &ldquo;Recipient&rdquo; is
          the test inbox it actually went to; &ldquo;Intended for&rdquo; is the real student.
        </p>
      </div>

      {logRows.length === 0 ? (
        <p className="text-[14px] text-slate">No emails logged yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-rule bg-paper text-slate">
                <tr>
                  <th className="h-10 px-4 font-medium">When</th>
                  <th className="h-10 px-4 font-medium">Recipient</th>
                  <th className="h-10 px-4 font-medium">Intended for</th>
                  <th className="h-10 px-4 font-medium">Subject</th>
                  <th className="h-10 px-4 font-medium">Mode</th>
                  <th className="h-10 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((row) => (
                  <tr key={row.id} className="border-b border-rule align-top last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-slate">
                      {formatDateTimeIST(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{row.to_email}</td>
                    <td className="px-4 py-2.5 text-slate">
                      {row.intended ? `${row.intended.name} (${row.intended.email})` : "—"}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-ink" title={row.subject ?? ""}>
                      {row.subject ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate uppercase">{row.mode ?? "—"}</td>
                    <td className={`px-4 py-2.5 font-medium ${STATUS_TEXT[row.status] ?? "text-ink"}`}>
                      {row.status}
                      {row.error && (
                        <p className="mt-0.5 max-w-[220px] font-normal text-closing" title={row.error}>
                          {row.error}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 sm:hidden">
            {logRows.map((row) => (
              <div key={row.id} className="rounded-[14px] border border-rule bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[14.5px] font-medium text-ink">{row.subject ?? "—"}</p>
                  <span className={`shrink-0 text-[12.5px] font-semibold ${STATUS_TEXT[row.status] ?? "text-ink"}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-slate">
                  To {row.to_email}
                  {row.intended && ` · intended for ${row.intended.name}`}
                </p>
                <p className="mt-0.5 text-[11.5px] tabular-nums text-shut">
                  {formatDateTimeIST(row.created_at)} · {(row.mode ?? "—").toUpperCase()}
                </p>
                {row.error && <p className="mt-1 text-[11.5px] text-closing">{row.error}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
