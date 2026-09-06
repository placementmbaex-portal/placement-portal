import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/require-admin";

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function uniqueFilename(used: Set<string>, base: string) {
  let candidate = base || "CV";
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Verified against the caller's own session first, with the regular
  // RLS-bound client. The service role key below is only ever used for the
  // bulk storage download, never for authorization.
  const { supabase } = await requireAdmin();
  const { id: jobId } = await params;

  const idsParam = new URL(request.url).searchParams.get("ids");
  const applicationIds = idsParam
    ? idsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : null;

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

  // Queried directly against applications rather than application_export --
  // that view has no application id column (its columns are the company
  // template's, verbatim) so it can't be filtered down to a selection.
  let rowsQuery = supabase
    .from("applications")
    .select("id, cv:cvs(file_path, label), student:students(name, roll_no)")
    .eq("job_id", jobId);
  if (applicationIds) {
    rowsQuery = rowsQuery.in("id", applicationIds);
  }
  const { data: rows, error } = await rowsQuery.overrideTypes<
    {
      id: string;
      cv: { file_path: string; label: string } | null;
      student: { name: string; roll_no: string | null } | null;
    }[],
    { merge: false }
  >();

  if (error) {
    return NextResponse.json(
      { error: "Could not read applicants." },
      { status: 500 },
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const row of rows ?? []) {
    const cvPath = row.cv?.file_path;
    if (!cvPath) continue;

    const { data: file, error: downloadError } = await serviceClient.storage
      .from("cvs")
      .download(cvPath);
    if (downloadError || !file) continue;

    const rollNo = row.student?.roll_no || "NoRollNo";
    const name = row.student?.name || "Unnamed";
    const filename = uniqueFilename(
      usedNames,
      sanitizeFilename(`${rollNo}_${name}`),
    );

    zip.file(`${filename}.pdf`, await file.arrayBuffer());
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const zipFilename = sanitizeFilename(
    `${job.company?.name ?? "Company"}_${job.title}_CVs.zip`,
  );

  // `Uint8Array.from` re-copies onto a plain ArrayBuffer; the value coming
  // out of generateAsync is typed as backed by ArrayBufferLike (which also
  // covers SharedArrayBuffer), which TS's Blob/BodyInit types reject.
  return new NextResponse(new Blob([Uint8Array.from(zipBuffer)]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
