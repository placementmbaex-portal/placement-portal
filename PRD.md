# MBAEx Placement Portal — Product Requirements

**Owner:** Placement Representatives, MBAEx
**Stakeholders:** CDPO, MBAEx cohort (81 students)
**Status:** R1 live. R2 in planning.
**Last updated:** 5 September 2026

---

## 1. Why this exists

Placement coordination currently runs on WhatsApp groups, email threads and
shared spreadsheets. Three things break repeatedly:

- Students miss deadlines because announcements scroll away in a group chat
- Placereps rebuild the same applicant spreadsheet by hand for every company
- Nobody has a single answer to "what is open right now and who applied"

The portal is not trying to run the placement process. It is trying to be the
one place where the answer to those questions lives, so that the committee
spends its time talking to companies rather than chasing formatting.

**Success looks like:** by the end of the season, no student misses a deadline
because they did not know about it, and no placerep assembles an applicant
list manually.

---

## 2. Who uses it

**Students (81).** Working professionals, roughly 28–38, mostly on phones,
mostly checking in short bursts between work and class. They care about three
things: what is open, when does it close, did my application go through.

**Placereps (4–6).** On laptops. Create companies and jobs, post announcements,
pull applicant lists, send them to recruiters. They are the heaviest users.

**CDPO (2–3).** Same access as placereps. Lower frequency, higher stakes — they
want oversight and clean exports, not day-to-day operation.

There is no separate "super admin" tier. Placereps and CDPO share one admin
role. Trust inside the committee is high enough that finer permissions would
cost more than they are worth.

---

## 3. What shipped — R1

Live at the Vercel URL. Working today:

- Google sign-in restricted to an allowlist of 81 institute emails
- Student profile: name, roll number, degree and experience set by admins;
  phone and LinkedIn editable by the student
- CV upload, up to three PDFs per student, private storage, signed-URL viewing
- Company pages with sector, description, tags and legacy-recruiter flag
- Jobs under companies, with JD attachment, location, deadline and an optional
  minimum-experience bar
- One-click apply with CV selection, and withdrawal before the deadline
- Deadline, closed-job and eligibility rules enforced in the database
- Admin applicant table per job, CV download as a ZIP, and an Excel export whose
  columns match the standard company template exactly

**What R1 deliberately does not do:** everything below.

---

## 4. Release plan

| Release | Theme | Ships | Why now |
|---|---|---|---|
| R1 | Apply | Done | The irreducible core |
| R2 | Communication | ~2 weeks | Kills the WhatsApp dependency |
| R3 | Scheduling | ~3 weeks after R2 | Removes the worst manual coordination |
| R4 | Intelligence | Off-season | Only useful once there is data |

Ship each release fully before starting the next. A half-built calendar is
worse than no calendar, because students will trust it and then be wrong.

---

## 5. R2 — Communication

The single highest-value release. Everything here replaces a WhatsApp message.

### 5.1 Announcements

**Student story:** I open the portal and see what the committee has told us,
in order, without scrolling through a group chat.

A reverse-chronological feed on the dashboard. Each announcement has a title,
body with basic formatting, an author, a timestamp, and optionally an attached
PDF and a link to a related company or job.

Admins post directly and their posts appear immediately. Students may also
submit an announcement, which sits in a moderation queue until any admin
approves it. Rejected submissions return to the student with a reason.

Admins can pin up to three announcements to the top. Pinned items show a
different left rule from the rest of the feed, not a badge.

Comments are threaded one level deep. Any signed-in user can comment. Admins
can delete any comment; students can delete their own. Admins can lock comments
on an individual announcement.

**Acceptance criteria**
- [ ] A student submission does not appear in the feed until approved
- [ ] An admin sees a count of pending submissions in the header
- [ ] Attachments open through a signed URL, never a public path
- [ ] The feed loads in under a second with 200 announcements present
- [ ] Comments are visible on mobile without horizontal scrolling

### 5.2 Notifications

**Student story:** I find out a role opened without having to check the portal.

Two channels, both driven by the same event table.

*In-app:* a count in the header, and a panel listing unread items. An item links
to whatever caused it.

*Email:* sent through Resend. Free tier covers this comfortably at 90 users.

Events that notify:

| Event | Who gets it | Channel |
|---|---|---|
| New job opened | All students meeting the eligibility bar | In-app + email |
| Deadline in 24 hours | Students who have not applied | In-app + email |
| Announcement posted | All students | In-app; email only if admin ticks "notify" |
| Application status changed | The one student | In-app + email |
| Announcement awaiting approval | All admins | In-app |
| Comment on your announcement | The author | In-app |

Students get one settings toggle: email on or off, with deadline reminders
always on regardless. Granular per-event preferences are not worth the
complexity at this scale.

The 24-hour reminder runs as a Vercel Cron job hitting an authenticated route
once an hour, checking for jobs crossing the threshold.

**Acceptance criteria**
- [ ] No student receives the same notification twice
- [ ] Emails come from a verified domain, not a personal Gmail
- [ ] A student who already applied gets no deadline reminder for that job
- [ ] Turning email off still leaves in-app notifications working

### 5.3 Application status

**Student story:** I know whether my application went anywhere.

Today an application is binary. R2 gives it a lifecycle:

`Applied → Shortlisted → In process → Offer` or `Not selected`

Only admins change status. Students see their own status on the dashboard and
on the job page, with a timestamp of the last change. Every change fires a
notification.

"In process" is deliberately vague — it covers tests, group discussions and
interview rounds without the portal needing to model them.

**Acceptance criteria**
- [ ] Status changes are logged with who changed them and when
- [ ] A student sees only their own status, never the roster
- [ ] Bulk status change works on a multi-select in the applicant table

### 5.4 Bulk shortlist upload

**Placerep story:** the company sends back a list of 12 names. I do not want to
click 12 dropdowns.

On the applicant table, a "Mark shortlisted" action that accepts either pasted
emails or roll numbers, one per line, or an uploaded CSV. The portal matches
them against applicants, shows what it matched and what it could not, and only
applies changes after confirmation.

Unmatched entries are shown clearly rather than silently ignored. This is where
data errors surface, so the preview screen matters more than the upload.

**Acceptance criteria**
- [ ] A preview shows matched and unmatched rows before anything is written
- [ ] Matching is case-insensitive and tolerates surrounding whitespace
- [ ] An email that is not an applicant for this job is reported, not created
- [ ] Notifications fire once per student, after confirmation

### 5.5 Calendar

**Student story:** I see what is happening this week without reading every
announcement.

A month view on desktop, an agenda list on mobile. Event types: PPT, written
test, interview day, deadline, and a general "other".

Job deadlines appear automatically as calendar entries — no admin has to
duplicate them. Other events are created by admins with a title, type, company,
start and end time, and either a venue or a joining link.

Events have a visibility setting: everyone, or only students shortlisted for a
given job. An interview day should not be visible to people not in it.

An "Add to Google Calendar" link on each event. Full calendar sync is R4.

**Acceptance criteria**
- [ ] Deadlines appear without manual entry and update when a deadline moves
- [ ] A student not shortlisted cannot see a restricted event, including by URL
- [ ] All times display in IST with the timezone named
- [ ] The mobile agenda is usable one-handed

---

## 6. R3 — Scheduling

Replaces the coordination that currently happens over phone calls.

### 6.1 PPT scheduler

Admins schedule a pre-placement talk against a company, with time, venue or
link, and an optional RSVP requirement. Students RSVP; admins see the count and
the list. If attendance is mandatory, admins can mark attendance from that list
and export it.

The real requirement here is the count. Committees need to tell a recruiter how
many people will be in the room, two days in advance.

### 6.2 Interview slot booking

The largest single time-saver in the whole roadmap.

Admins publish a set of slots for a job — a date, an interval, a number of
parallel panels. Shortlisted students see only the slots for interviews they
are actually in, and claim one. Claiming is first-come-first-served and a slot
disappears the moment it is taken.

Admins see the full grid, can block slots, can move a student, and can export
the schedule as a table to send to the recruiter.

Concurrency matters here in a way it does not elsewhere in the product: 30
students hitting the same slot at once must produce exactly one booking. This
needs a database-level unique constraint, not application logic.

**Acceptance criteria**
- [ ] Two simultaneous claims on one slot result in one success and one clear failure
- [ ] A student cannot hold two slots for the same job
- [ ] Cancelling releases the slot immediately
- [ ] Admins can close booking at a cutoff time

### 6.3 Offer tracking

Admins record an offer against a student and a job: role, location,
compensation, offer date, and the student's response with a decision deadline.

This is the input to every statistic the committee will be asked for. It is
also sensitive — compensation is visible to admins only, never to other
students, and the aggregate dashboard shows bands rather than individual
figures.

Whether an accepted offer removes a student from the process is a **policy
decision, not a product one**. The portal supports either. See section 9.

### 6.4 Document vault

A simple admin-managed file list: placement policy, CV template, past JDs,
company decks. Each file has a title, a category and a visibility flag. Not
exciting, but it ends the "can someone resend the CV format" message.

---

## 7. R4 — Intelligence

Build only after a season of real data exists.

**Placement dashboard.** Percentage placed, offers by sector and function,
compensation bands, applications per role, conversion from application to
shortlist to offer. The committee will need this for its end-of-season report,
so design the export before the charts.

**Company relationship tracking.** Point of contact, interaction history,
pipeline stage from prospecting to closed, notes. Admin-only. Effectively a
light CRM, and the thing that makes next year's committee faster than this one.

**Feedback capture.** A short form after each process asking what was asked and
how it went. Becomes the interview-preparation resource for the next cohort.

**Multi-year history.** Archive a season and start a new one without losing the
old data, so year-on-year comparisons work.

---

## 8. Not building

Stated explicitly so the conversation does not reopen every fortnight:

- **A CV builder.** Students have CVs. The institute has a format.
- **Direct messaging.** WhatsApp exists and is better at it.
- **Video interviews.** Companies use their own tools.
- **A native mobile app.** The web app on a phone is sufficient and one codebase.
- **Automated eligibility beyond years of experience.** Rules multiply, edge
  cases multiply faster, and a placerep can override in five seconds.
- **Company logins.** Recruiters will not adopt a portal for one hiring cycle.
  Email them the export.

---

## 9. Decisions needed before R3

These are committee decisions, not engineering ones. R2 does not depend on them.

1. **Does an accepted offer end a student's process?** If yes, the portal blocks
   further applications automatically. If no, it does nothing. Either is a
   one-line change; making it after students have started applying is not.

2. **Who approves student announcements?** Any admin, or a named person? Affects
   whether the queue needs assignment.

3. **Is PPT attendance mandatory?** Determines whether attendance marking is
   worth building.

4. **Are compensation figures shown to students at all?** Currently hidden.
   Some committees show bands on the job page.

---

## 10. Data model additions for R2

New tables, on top of the existing six:

```
announcements      author_id, title, body, status (pending/approved/rejected),
                   is_pinned, attachment_path, company_id, job_id,
                   comments_locked, published_at

comments           announcement_id, author_id, body, parent_id, created_at

events             title, type (ppt/test/interview/deadline/other),
                   company_id, job_id, starts_at, ends_at, venue, link,
                   visibility (all/shortlisted), created_by

notifications      user_id, type, title, body, link, read_at, created_at

application_status_history
                   application_id, from_status, to_status, changed_by, changed_at
```

Plus a `status` column on `applications` and an `email_notifications` boolean
on `students`.

Row-level security follows the existing pattern. The one new shape is the
restricted event: a student may read an event only if visibility is `all`, or
if they hold an application with status `shortlisted` or beyond for the linked
job.

---

## 11. Working with this document

Keep it current. When a feature ships, move it into section 3 and delete its
spec. When someone proposes something, it goes into section 7 or section 8 —
never straight into the next release.

For building: give Claude Code this file and `DESIGN.md` together, then work one
sub-section at a time. "Build 5.1 Announcements per the PRD, following
DESIGN.md" produces better results than describing the feature from scratch,
because the acceptance criteria give it something to check itself against.
