import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatDateTimeIST } from "@/lib/format";
import { RestoreButton } from "./restore-button";
import { PermanentDeleteModal } from "./permanent-delete-modal";

type TrashCompanyRow = {
  id: string;
  name: string;
  deleted_at: string;
  deleter: { name: string } | null;
};

type TrashJobRow = {
  id: string;
  title: string;
  deleted_at: string;
  deleter: { name: string } | null;
  company: { name: string } | null;
};

type TrashAnnouncementRow = {
  id: string;
  title: string;
  deleted_at: string;
  deleter: { name: string } | null;
};

type TrashRow = {
  kind: "company" | "job" | "announcement";
  id: string;
  name: string;
  deletedAt: string;
  deletedBy: string;
  applications: number;
};

type DeletionLogRow = {
  id: string;
  entity_type: string;
  entity_label: string | null;
  applications_destroyed: number;
  deleted_at: string;
  deleter: { name: string } | null;
};

async function TrashView() {
  const { supabase } = await requireAdmin();

  const [{ data: companies }, { data: jobs }, { data: announcements }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, deleted_at, deleter:students!deleted_by(name)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .overrideTypes<TrashCompanyRow[], { merge: false }>(),
    supabase
      .from("jobs")
      .select("id, title, deleted_at, deleter:students!deleted_by(name), company:companies(name)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .overrideTypes<TrashJobRow[], { merge: false }>(),
    supabase
      .from("announcements")
      .select("id, title, deleted_at, deleter:students!deleted_by(name)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .overrideTypes<TrashAnnouncementRow[], { merge: false }>(),
  ]);

  const rows: TrashRow[] = [];

  await Promise.all([
    ...((companies ?? []).map(async (company) => {
      const { data } = await supabase.rpc("deletion_impact", {
        p_kind: "company",
        p_id: company.id,
      });
      rows.push({
        kind: "company",
        id: company.id,
        name: company.name,
        deletedAt: company.deleted_at,
        deletedBy: company.deleter?.name ?? "—",
        applications: data?.applications ?? 0,
      });
    })),
    ...((jobs ?? []).map(async (job) => {
      const { data } = await supabase.rpc("deletion_impact", {
        p_kind: "job",
        p_id: job.id,
      });
      rows.push({
        kind: "job",
        id: job.id,
        name: job.company?.name ? `${job.title} · ${job.company.name}` : job.title,
        deletedAt: job.deleted_at,
        deletedBy: job.deleter?.name ?? "—",
        applications: data?.applications ?? 0,
      });
    })),
    ...((announcements ?? []).map(async (announcement) => {
      rows.push({
        kind: "announcement",
        id: announcement.id,
        name: announcement.title,
        deletedAt: announcement.deleted_at,
        deletedBy: announcement.deleter?.name ?? "—",
        applications: 0,
      });
    })),
  ]);

  rows.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const KIND_LABEL: Record<TrashRow["kind"], string> = {
    company: "Company",
    job: "Role",
    announcement: "Announcement",
  };

  if (rows.length === 0) {
    return <p className="text-[14px] text-slate">Nothing in trash.</p>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
        <table className="w-full text-left text-[13.5px]">
          <thead className="border-b border-rule bg-paper text-slate">
            <tr>
              <th className="h-10 px-4 font-medium">Name</th>
              <th className="h-10 px-4 font-medium">Kind</th>
              <th className="h-10 px-4 font-medium">Deleted</th>
              <th className="h-10 px-4 font-medium">By</th>
              <th className="h-10 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="h-12 border-b border-rule last:border-0">
                <td className="px-4 font-medium text-ink">{row.name}</td>
                <td className="px-4 text-slate">{KIND_LABEL[row.kind]}</td>
                <td className="px-4 whitespace-nowrap tabular-nums text-slate">
                  {formatDateTimeIST(row.deletedAt)}
                </td>
                <td className="px-4 text-slate">{row.deletedBy}</td>
                <td className="px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-3.5">
                    <RestoreButton kind={row.kind} id={row.id} />
                    {row.kind === "announcement" ? (
                      <span className="text-shut" title="Permanent delete for announcements is coming soon">
                        Permanently delete
                      </span>
                    ) : row.applications === 0 ? (
                      <PermanentDeleteModal kind={row.kind} id={row.id} name={row.name} />
                    ) : (
                      <span
                        className="text-shut"
                        title={`Has ${row.applications} application${row.applications === 1 ? "" : "s"} on record`}
                      >
                        Permanently delete
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 sm:hidden">
        {rows.map((row) => (
          <div key={`${row.kind}-${row.id}`} className="rounded-[14px] border border-rule bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold text-ink">{row.name}</p>
                <p className="mt-0.5 text-[12px] text-slate">
                  {KIND_LABEL[row.kind]} · deleted {formatDateTimeIST(row.deletedAt)} by {row.deletedBy}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <RestoreButton kind={row.kind} id={row.id} />
              {row.kind === "announcement" ? (
                <span className="text-[13px] text-shut">Permanently delete</span>
              ) : row.applications === 0 ? (
                <PermanentDeleteModal kind={row.kind} id={row.id} name={row.name} />
              ) : (
                <span
                  className="text-[13px] text-shut"
                  title={`Has ${row.applications} application${row.applications === 1 ? "" : "s"} on record`}
                >
                  Permanently delete
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function DeletionLogView() {
  const { supabase } = await requireAdmin();

  // Nothing writes to this table yet -- permanently_delete_job/company/
  // announcement() exist in schema_r4.sql, but wiring the trash actions
  // above to call them (so they actually snapshot + log) is later work.
  // Until then this view is correctly, honestly empty.
  const { data: log } = await supabase
    .from("deletion_log")
    .select("id, entity_type, entity_label, applications_destroyed, deleted_at, deleter:students!deleted_by(name)")
    .order("deleted_at", { ascending: false })
    .limit(200)
    .overrideTypes<DeletionLogRow[], { merge: false }>();

  const rows = log ?? [];

  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-slate">
        Nothing permanently destroyed yet. This will list every permanent delete once it happens,
        with who did it and when.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-rule bg-paper text-slate">
          <tr>
            <th className="h-10 px-4 font-medium">Name</th>
            <th className="h-10 px-4 font-medium">Kind</th>
            <th className="h-10 px-4 font-medium">Applications destroyed</th>
            <th className="h-10 px-4 font-medium">When</th>
            <th className="h-10 px-4 font-medium">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="h-12 border-b border-rule last:border-0">
              <td className="px-4 font-medium text-ink">{row.entity_label ?? "—"}</td>
              <td className="px-4 text-slate capitalize">{row.entity_type}</td>
              <td className="px-4 tabular-nums text-slate">{row.applications_destroyed}</td>
              <td className="px-4 whitespace-nowrap tabular-nums text-slate">
                {formatDateTimeIST(row.deleted_at)}
              </td>
              <td className="px-4 text-slate">{row.deleter?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const activeView = view === "log" ? "log" : "trash";

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] leading-[1.2] font-semibold text-ink">Trash</h1>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-slate">
          Deleted companies, roles and announcements are hidden from students and from every
          admin list, but nothing is destroyed until you permanently delete it here.
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/settings/trash"
          className={`flex h-9 items-center rounded-full px-3.5 font-body text-[13px] ${
            activeView === "trash"
              ? "bg-navy font-semibold text-white"
              : "border border-rule bg-surface font-medium text-ink"
          }`}
        >
          Trash
        </Link>
        <Link
          href="/admin/settings/trash?view=log"
          className={`flex h-9 items-center rounded-full px-3.5 font-body text-[13px] ${
            activeView === "log"
              ? "bg-navy font-semibold text-white"
              : "border border-rule bg-surface font-medium text-ink"
          }`}
        >
          Deletion log
        </Link>
      </div>

      {activeView === "trash" ? <TrashView /> : <DeletionLogView />}
    </main>
  );
}
