import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ProfileForm } from "./profile-form";
import { CvUploadForm } from "./cv-upload-form";
import { deleteCv, viewCv } from "./actions";

const MAX_CVS = 3;

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: student }, { data: cvs }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "name, email, roll_no, college, degree, specialization, total_experience_years, phone, linkedin",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("cvs")
      .select("id, label, file_path, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!student) redirect("/login");

  const cvList = cvs ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Profile
      </h1>

      <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Your details</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={student.name} />
          <Field label="Roll no." value={student.roll_no ?? "—"} />
          <Field label="Email" value={student.email} />
          <Field label="College" value={student.college} />
          <Field label="Degree" value={student.degree} />
          <Field label="Specialization" value={student.specialization} />
          <Field
            label="Experience"
            value={
              student.total_experience_years != null
                ? `${student.total_experience_years} yrs`
                : "—"
            }
          />
        </dl>
        <p className="text-xs text-zinc-400">
          Set by admins. Contact a placement rep to correct any of this.
        </p>
      </section>

      <ProfileForm phone={student.phone} linkedin={student.linkedin} />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-500">Your CVs</h2>

        {cvList.length === 0 ? (
          <p className="text-sm text-zinc-500">No CVs uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {cvList.map((cv) => (
              <li
                key={cv.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {cv.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Uploaded {formatDateIST(cv.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <form action={viewCv.bind(null, cv.id)}>
                    <button
                      type="submit"
                      formTarget="_blank"
                      className="text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      View
                    </button>
                  </form>
                  <form action={deleteCv.bind(null, cv.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Delete this CV? This cannot be undone."
                      pendingLabel="Deleting…"
                      className="text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {cvList.length < MAX_CVS ? (
          <CvUploadForm />
        ) : (
          <p className="text-xs text-zinc-400">
            You&apos;ve reached the {MAX_CVS} CV limit. Delete one to upload
            another.
          </p>
        )}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}
