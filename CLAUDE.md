# IIM Calcutta MBAEx Placement Portal

A student-facing noticeboard for the MBAEx placement season. ~81 students, ~5 admins.
Built to be shipped in a day. Prefer the boring, obvious solution everywhere.

## Stack

- Next.js 15, App Router, TypeScript
- Tailwind CSS
- Supabase: Postgres + Auth (Google) + Storage
- `@supabase/ssr` for cookie-based auth in server components
- Deployed on Vercel

## What this app does

1. Student signs in with their institute Google account
2. Uploads one or two CVs as PDFs
3. Browses open jobs, grouped under companies
4. Clicks apply, picks which CV, done -- **there is no application form**
5. Admins create companies and jobs, see who applied, download a ZIP of CVs
   and an .xlsx matching the company's requested template

## Rules

- **The database is the security boundary.** RLS policies and Postgres triggers
  enforce everything. Role checks in React are for hiding buttons only.
- **Never use the service_role key in client code.** Server actions and route
  handlers only, and only where RLS genuinely cannot express the rule.
- **CV files are served through short-lived signed URLs** (60s). The `cvs` bucket
  is private. Never link a raw storage path.
- **CV storage path is always `{student_id}/{uuid}.pdf`.** Storage RLS depends on it.
- Deadline, open/closed and minimum-experience checks already exist as a
  Postgres trigger (`guard_application`). Mirror them in the UI for a nice
  message, but do not treat the UI as the check.
- Students can only edit `phone` and `linkedin` on their own record. A trigger
  reverts anything else. Do not build UI for the other fields.

## Schema

`allowed_students` -- signup allowlist, seeded from CSV before launch
`students`         -- one row per user, auto-created on first sign-in
`cvs`              -- label + storage path
`companies`        -- name, sector, about, tags, is_legacy_recruiter
`jobs`             -- company_id, title, jd_path, location, deadline, is_open,
                      min_experience_years
`applications`     -- job_id, student_id, cv_id, unique per pair
`application_export` -- view producing the company template columns verbatim

Full DDL is in `schema.sql`.

## Routes

```
/login                      Google sign-in
/                           student dashboard: open jobs + my applications
/profile                    phone, linkedin, CV upload and delete
/companies/[id]             company page with its open jobs
/jobs/[id]                  job detail + apply
/admin                      admin home
/admin/companies            list + create/edit
/admin/jobs                 list + create/edit, open/close toggle
/admin/jobs/[id]/applicants applicant table, CV zip, xlsx export
/admin/students             roster and allowlist
```

Guard `/admin/*` in `middleware.ts` by reading `students.is_admin`.

## UI conventions

- Mobile first. Students are on phones; admins are on laptops.
- Job cards show: company name, title, location, deadline countdown, applied badge.
- Applying is a single confirm dialog with a CV dropdown. No multi-step wizard.
- Show deadlines in IST, formatted like `Wed 12 Mar, 6:00 PM`.
- No toast library, no component library, no state manager. Server components
  plus a few `'use client'` islands.

## Out of scope for v1

Announcements, comments, calendars, shortlists, offer tracking, email
notifications, one-offer-and-out rules, interview scheduling. Do not build these.
