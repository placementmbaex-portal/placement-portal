"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { Audience } from "@/lib/audience";
import {
  getAudienceCount,
  postAnnouncement,
  searchStudents,
  type PostAnnouncementState,
  type StudentSearchResult,
} from "./actions";

const fieldClass =
  "h-10 w-full rounded-md border border-rule px-3 text-[14px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink";
const labelClass = "mb-1.5 block text-[12.5px] text-slate";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "applied", label: "Applied to a role" },
  { value: "shortlisted", label: "Shortlisted for a role" },
  { value: "not_applied", label: "Not applied to a role" },
  { value: "hand_picked", label: "Hand-picked" },
];

const STATUS_TEXT: Record<string, string> = {
  sent: "text-live",
  suppressed: "text-slate",
  failed: "text-closing",
};

const initialState: PostAnnouncementState = null;

export function AnnouncementComposer({
  companies,
  jobs,
  emailMode,
  announcementEmailDefault,
}: {
  companies: { id: string; name: string }[];
  jobs: { id: string; title: string; companyName: string }[];
  emailMode: "off" | "test" | "live";
  announcementEmailDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(postAnnouncement, initialState);

  const [publishImmediately, setPublishImmediately] = useState(true);
  const [audience, setAudience] = useState<Audience>("everyone");
  const [audienceJobId, setAudienceJobId] = useState("");
  const [handPicked, setHandPicked] = useState<StudentSearchResult[]>([]);
  const [sendEmail, setSendEmail] = useState(announcementEmailDefault);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // null doubles as "loading" for the four DB-backed audiences -- reset to
  // null from the event handlers below whenever the selection changes, so
  // the effect's only job is to fill it back in once the count arrives.
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const needsJob = audience === "applied" || audience === "shortlisted" || audience === "not_applied";

  // Recipient count is only fetched for the four DB-backed audiences --
  // hand-picked and "no job chosen yet" are both derived at render time
  // below instead, so this effect has nothing to compute for those cases.
  const dbBacked = publishImmediately && audience !== "hand_picked" && !(needsJob && !audienceJobId);

  // Setting state here happens only inside the async .then() callback, not
  // synchronously in the effect body -- the loading indicator instead comes
  // from recipientCount already being reset to null by the handlers that
  // change audience/audienceJobId (selectAudience, below).
  useEffect(() => {
    if (!dbBacked) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void getAudienceCount(audience, audienceJobId || null, []).then((count) => {
        if (!cancelled) setRecipientCount(count);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dbBacked, audience, audienceJobId]);

  const displayedCount = audience === "hand_picked" ? handPicked.length : needsJob && !audienceJobId ? 0 : recipientCount;
  const isCounting = dbBacked && recipientCount === null;

  function selectAudience(next: Audience) {
    setAudience(next);
    setRecipientCount(null);
  }

  function selectAudienceJob(next: string) {
    setAudienceJobId(next);
    setRecipientCount(null);
  }

  // Same shape as the count effect: the query-cleared/too-short case is
  // handled by handleQueryChange (an event handler, so setState there is
  // fine), leaving this effect's body free of any synchronous setState.
  useEffect(() => {
    if (audience !== "hand_picked" || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchStudents(query).then((r) => {
        if (!cancelled) {
          setResults(r);
          setSearching(false);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, audience]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  if (state && "success" in state && state.success) {
    return (
      <div className="max-w-xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
        <div className="border-b border-rule bg-paper px-5.5 py-4.5">
          <h2 className="font-display text-[19px] font-semibold text-ink">Posted</h2>
          <p className="mt-0.75 text-[12.5px] text-slate">&ldquo;{state.title}&rdquo; is live.</p>
        </div>
        <div className="flex flex-col gap-4 px-5.5 py-5">
          <div>
            <p className="text-[14px] text-ink">
              {state.recipientCount} in-app notification{state.recipientCount === 1 ? "" : "s"} created.
            </p>
            {state.emailAttempted ? (
              <p className="mt-1 text-[12.5px] text-slate">
                {state.emailOutcomes.length} email{state.emailOutcomes.length === 1 ? "" : "s"} attempted
                {state.skippedForEmailToggle > 0
                  ? ` · ${state.skippedForEmailToggle} student${state.skippedForEmailToggle === 1 ? "" : "s"} have email notifications off and weren't emailed`
                  : ""}
                .
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-slate">Email wasn&apos;t requested for this post.</p>
            )}
          </div>

          {state.emailOutcomes.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-rule">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-rule bg-paper text-slate">
                  <tr>
                    <th className="h-9 px-3 font-medium">Recipient</th>
                    <th className="h-9 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.emailOutcomes.map((outcome, i) => (
                    <tr key={i} className="border-b border-rule last:border-0">
                      <td className="px-3 py-2 text-ink">
                        {outcome.studentName}
                        <span className="text-slate"> · {outcome.toEmail}</span>
                      </td>
                      <td className={`px-3 py-2 font-medium ${STATUS_TEXT[outcome.status] ?? "text-ink"}`}>
                        {outcome.status}
                        {outcome.error && <span className="block font-normal text-closing">{outcome.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Link href="/admin/announcements" className="text-[13.5px] font-medium text-navy hover:underline">
              View announcements
            </Link>
            <Link href="/admin/email-log" className="text-[13.5px] font-medium text-navy hover:underline">
              View full email log
            </Link>
            <a href="/admin/announcements/new" className="text-[13.5px] text-slate hover:underline">
              Compose another
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl">
      <div className="overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
        <div className="flex flex-col gap-3.5 px-5.5 py-5">
          <div>
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input id="title" name="title" required className={fieldClass} />
          </div>

          <div>
            <label htmlFor="body" className={labelClass}>
              Body
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={6}
              className="w-full rounded-md border border-rule px-3 py-2 text-[14px] leading-[1.55] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="company_id" className={labelClass}>
                Related company (optional)
              </label>
              <select id="company_id" name="company_id" defaultValue="" className={fieldClass}>
                <option value="">None</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job_id" className={labelClass}>
                Related role (optional)
              </label>
              <select id="job_id" name="job_id" defaultValue="" className={fieldClass}>
                <option value="">None</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.companyName} — {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="attachment" className={labelClass}>
              Attachment PDF (optional, max 2MB)
            </label>
            <input id="attachment" name="attachment" type="file" accept="application/pdf" className="block w-full text-[14px] text-ink" />
          </div>

          <label className="flex items-center gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              name="publish_immediately"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="h-4 w-4"
            />
            Publish immediately
          </label>
        </div>

        {publishImmediately && (
          <div className="flex flex-col gap-3.5 border-t border-rule bg-paper px-5.5 py-5">
            <div>
              <p className={labelClass}>Notify</p>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectAudience(opt.value)}
                    className={`flex h-[34px] items-center rounded-full px-3.5 font-body text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      audience === opt.value
                        ? "bg-navy font-semibold text-white focus-visible:outline-white"
                        : "border border-rule bg-surface font-medium text-ink focus-visible:outline-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {needsJob && (
              <div>
                <label htmlFor="audience_job_id_select" className={labelClass}>
                  Which role
                </label>
                <select
                  id="audience_job_id_select"
                  value={audienceJobId}
                  onChange={(e) => selectAudienceJob(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choose a role…</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.companyName} — {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audience === "hand_picked" && (
              <div>
                <label htmlFor="student_search" className={labelClass}>
                  Search by name, email or roll number
                </label>
                <div className="relative">
                  <input
                    id="student_search"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Start typing…"
                    autoComplete="off"
                    className={fieldClass}
                  />
                  {query.trim().length >= 2 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 z-10 max-h-56 w-full overflow-y-auto rounded-md border border-rule bg-surface shadow-[0_1px_3px_rgba(22,32,46,0.08)]">
                      {searching ? (
                        <p className="px-3 py-2.5 text-[13px] text-slate">Searching…</p>
                      ) : results.length === 0 ? (
                        <p className="px-3 py-2.5 text-[13px] text-slate">No students match.</p>
                      ) : (
                        results.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setHandPicked((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]));
                              setQuery("");
                              setResults([]);
                            }}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                          >
                            <span className="text-[13.5px] font-medium text-ink">{s.name}</span>
                            <span className="text-[12px] text-slate">
                              {s.email}
                              {s.rollNo ? ` · ${s.rollNo}` : ""}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {handPicked.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {handPicked.map((s) => (
                      <span
                        key={s.id}
                        className="flex items-center gap-1.5 rounded-full border border-rule bg-surface py-1 pr-1.5 pl-3 text-[12.5px] text-ink"
                      >
                        {s.name}
                        <button
                          type="button"
                          onClick={() => setHandPicked((prev) => prev.filter((p) => p.id !== s.id))}
                          aria-label={`Remove ${s.name}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-slate hover:text-closing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {handPicked.map((s) => (
                  <input key={s.id} type="hidden" name="hand_picked_id" value={s.id} />
                ))}
              </div>
            )}

            <input type="hidden" name="audience" value={audience} />
            <input type="hidden" name="audience_job_id" value={audienceJobId} />

            <p className="text-[13.5px] font-medium text-ink">
              {isCounting
                ? "Counting…"
                : `This will notify ${displayedCount} student${displayedCount === 1 ? "" : "s"}.`}
            </p>

            <div>
              <label className="flex items-center gap-2.5 text-[14px] text-ink">
                <input
                  type="checkbox"
                  name="send_email"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4"
                />
                Send email
              </label>
              {sendEmail && emailMode !== "live" && (
                <p className="mt-1.5 inline-block rounded-md bg-flame px-2.5 py-1.5 text-[12px] font-medium text-white">
                  Email mode is {emailMode.toUpperCase()} — these emails will be redirected to the test
                  recipients, not sent to real students.
                </p>
              )}
            </div>
          </div>
        )}

        {state && "error" in state && state.error && (
          <p className="px-5.5 pt-4 text-[13.5px] text-closing">{state.error}</p>
        )}

        <div className="flex items-center justify-end gap-4.5 border-t border-rule bg-paper px-5.5 py-4">
          <Link
            href="/admin/announcements"
            className="flex h-11 items-center text-[14px] text-slate hover:underline sm:h-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center rounded-md bg-navy px-4.5 font-body text-[14px] font-semibold text-white disabled:opacity-60 sm:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {pending ? "Posting…" : publishImmediately ? "Post announcement" : "Save as pending"}
          </button>
        </div>
      </div>
    </form>
  );
}
