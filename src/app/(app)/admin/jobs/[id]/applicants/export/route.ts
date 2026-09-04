import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/supabase/require-admin";

const HEADERS = [
  "S. No.",
  "Name",
  "Roll No.",
  "College Name",
  "Degree Name",
  "Specialization",
  "Total Years of Experience",
] as const;

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase } = await requireAdmin();
  const { id: jobId } = await params;

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company:companies(name)")
    .eq("id", jobId)
    .single()
    .overrideTypes<
      { title: string; company: { name: string } | null },
      { merge: false }
    >();

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("application_export")
    .select("*")
    .eq("job_id", jobId)
    .order("applied_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Could not read applicants." },
      { status: 500 },
    );
  }

  const sheetRows: unknown[][] = [
    [...HEADERS],
    ...(rows ?? []).map((row: Record<string, unknown>) =>
      HEADERS.map((header) => row[header] ?? ""),
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Applicants");

  const buffer: Buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const filename = sanitizeFilename(
    `${job.company?.name ?? "Company"}_${job.title}_applicants.xlsx`,
  );

  // See the CV zip route for why this isn't passed directly as a BlobPart.
  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
