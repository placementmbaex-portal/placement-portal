import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateIST } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileFieldsForm, type VisibleProfileField } from "./profile-fields-form";
import { CvUploadForm } from "./cv-upload-form";
import { EmailNotificationsToggle } from "./email-notifications-toggle";
import { deleteCv, viewCv } from "./actions";

const MAX_CVS = 3;

// A value only counts toward the completeness indicator once it has
// something in it: false and 0 are real answers (so they count), but an
// empty string, empty array, or unset key is not.
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: student }, { data: profileFields }, { data: cvs }, { data: applications }] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "name, email, roll_no, college, degree, specialization, total_experience_years, phone, linkedin, is_admin, profile, email_notifications",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("profile_fields")
        .select(
          "field_key, label, field_type, options, section, display_order, student_editable, required, help_text",
        )
        .eq("student_visible", true)
        .order("section", { ascending: true })
        .order("display_order", { ascending: true })
        .overrideTypes<VisibleProfileField[], { merge: false }>(),
      supabase
        .from("cvs")
        .select("id, label, file_path, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("applications").select("cv_id").eq("student_id", user.id),
    ]);

  if (!student) redirect("/login");

  // students.phone / students.linkedin predate the profile registry and
  // are now superseded by the "phone" / "linkedin" entries it seeds --
  // fall back to the old column only when the jsonb has never been
  // written, so an existing value isn't shown as blank the first time
  // this page loads under the new registry-driven form.
  const legacyColumnFallback: Record<string, string | null> = {
    phone: student.phone,
    linkedin: student.linkedin,
  };
  const profileValues: Record<string, unknown> = { ...(student.profile ?? {}) };
  for (const [key, legacyValue] of Object.entries(legacyColumnFallback)) {
    if (profileValues[key] === undefined) profileValues[key] = legacyValue;
  }

  const fields = profileFields ?? [];
  const sections = new Map<string, VisibleProfileField[]>();
  for (const field of fields) {
    const list = sections.get(field.section) ?? [];
    list.push(field);
    sections.set(field.section, list);
  }

  const requiredFields = fields.filter((field) => field.required);
  const completedCount = requiredFields.filter((field) =>
    isFilled(profileValues[field.field_key]),
  ).length;

  const cvList = cvs ?? [];
  const usageByCv = new Map<string, number>();
  for (const application of applications ?? []) {
    usageByCv.set(
      application.cv_id,
      (usageByCv.get(application.cv_id) ?? 0) + 1,
    );
  }
  const maxUsage = Math.max(0, ...Array.from(usageByCv.values()));

  const initials = student.name
    .trim()
    .split(/\s+/)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <div className="bg-ink px-5 pt-4 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/28 bg-navy font-body text-[19px] font-semibold text-white">
            {initials}
          </div>
          <div>
            <h1 className="font-display text-[21px] leading-[1.2] font-semibold text-white">
              {student.name}
            </h1>
            <p className="mt-0.5 text-[12.5px] tabular-nums text-white/65">
              {[
                student.roll_no,
                student.total_experience_years != null
                  ? `${student.total_experience_years} yrs`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4.5">
        <div className="flex items-baseline justify-between">
          <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
            Your CVs · {cvList.length} of {MAX_CVS}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 px-4">
        {cvList.map((cv) => {
          const usage = usageByCv.get(cv.id) ?? 0;
          const isTopUsed = maxUsage > 0 && usage === maxUsage;
          return (
            <div
              key={cv.id}
              className="flex items-center gap-3 rounded-xl border border-rule bg-surface p-3"
            >
              <div
                className={`flex h-11 w-9 shrink-0 items-end justify-center rounded-[5px] border pb-1 font-body text-[9px] font-bold ${
                  isTopUsed
                    ? "border-[rgba(251,88,19,0.3)] bg-[#FDEAE0] text-closing"
                    : "border-rule bg-scroll text-slate"
                }`}
              >
                PDF
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium text-ink">
                  {cv.label}
                </p>
                <p className="mt-0.5 text-[12px] text-slate">
                  Uploaded {formatDateIST(cv.created_at)}
                  {usage > 0
                    ? ` · used in ${usage} application${usage === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <form action={viewCv.bind(null, cv.id)}>
                  <button
                    type="submit"
                    formTarget="_blank"
                    aria-label={`View ${cv.label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-rule text-navy"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  </button>
                </form>
                <form action={deleteCv.bind(null, cv.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Delete this CV? This cannot be undone."
                    pendingLabel="…"
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-rule text-closing disabled:opacity-60"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          );
        })}

        {cvList.length < MAX_CVS ? (
          <CvUploadForm slotsLeft={MAX_CVS - cvList.length} />
        ) : (
          <p className="text-[12.5px] text-slate">
            You&apos;ve reached the {MAX_CVS} CV limit. Delete one to upload
            another.
          </p>
        )}
      </div>

      <div className="mt-4.5 px-5">
        <EmailNotificationsToggle enabled={student.email_notifications} />
      </div>

      <div className="px-5 pt-5.5">
        <p className="font-body text-[10.5px] font-semibold tracking-[0.1em] text-slate uppercase">
          Set by the committee
        </p>
      </div>
      <div className="mt-2.5 mx-4 overflow-hidden rounded-xl border border-rule bg-surface">
        {[
          ["Roll no.", student.roll_no ?? "—"],
          ["Email", student.email],
          ["College", student.college],
          ["Degree", student.degree],
          ["Specialisation", student.specialization],
          [
            "Total experience",
            student.total_experience_years != null
              ? `${student.total_experience_years} yrs`
              : "—",
          ],
        ].map(([label, value], i, arr) => (
          <div key={label}>
            <div className="flex justify-between px-3.5 py-2.5">
              <span className="text-[13px] text-slate">{label}</span>
              <span className="text-[13px] font-medium text-ink">{value}</span>
            </div>
            {i < arr.length - 1 && <div className="h-px bg-rule" />}
          </div>
        ))}
      </div>
      <p className="mt-2 px-5 text-[11.5px] leading-[1.5] text-shut">
        Contact a placement rep to correct any of this.
      </p>

      {requiredFields.length > 0 && (
        <div className="px-5 pt-5.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium text-ink">
              {completedCount} of {requiredFields.length} required fields complete
            </p>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rule">
            <div
              className="h-full rounded-full bg-ink"
              style={{
                width: `${Math.round((completedCount / requiredFields.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {sections.size > 0 && (
        <div className="mt-4.5 mb-5 px-5">
          <ProfileFieldsForm sections={Array.from(sections.entries())} values={profileValues} />
        </div>
      )}

      <div className="flex flex-col gap-3 px-5">
        {student.is_admin && (
          <Link href="/admin" className="flex h-11 items-center text-[14px] font-medium text-navy">
            Open admin
          </Link>
        )}
        <SignOutButton />
      </div>
    </main>
  );
}
