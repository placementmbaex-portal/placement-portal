-- =====================================================================
-- IIM Calcutta MBAEx Placement Portal -- schema
-- Paste the whole file into the Supabase SQL Editor and hit Run.
-- Safe to re-run: everything is guarded.
--
-- Covers R1 (core: students/cvs/companies/jobs/applications) and R2
-- (the communication layer: announcements/comments/events/notifications/
-- application status history -- see the "R2 -- COMMUNICATION LAYER"
-- section below). This file is meant to describe exactly what has
-- actually been run against the live database -- if you paste and run
-- something different from this file, update this file to match
-- immediately afterward, or the next person to read it (human or
-- Claude) will check code against a schema that isn't real.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Allowlist. Seed this BEFORE anyone signs in.
--    Anyone whose email is not here cannot create an account.
-- ---------------------------------------------------------------------
create table if not exists allowed_students (
  email                  text primary key,
  name                   text not null,
  roll_no                text,
  total_experience_years numeric(4,1),
  is_admin               boolean not null default false
);

-- ---------------------------------------------------------------------
-- 2. Students. One row per logged-in user, created automatically.
-- ---------------------------------------------------------------------
create table if not exists students (
  id                     uuid primary key references auth.users on delete cascade,
  email                  text unique not null,
  name                   text not null,
  roll_no                text,
  phone                  text,
  linkedin               text,
  college                text not null default 'IIM Calcutta',
  degree                 text not null default 'MBAEx',
  specialization         text not null default 'General Management',
  total_experience_years numeric(4,1),
  is_admin               boolean not null default false,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. CVs. Files live in the private 'cvs' storage bucket.
-- ---------------------------------------------------------------------
create table if not exists cvs (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students on delete cascade,
  label      text not null,
  file_path  text not null,
  created_at timestamptz not null default now()
);
create index if not exists cvs_student_idx on cvs (student_id);

-- ---------------------------------------------------------------------
-- 4. Companies.
-- ---------------------------------------------------------------------
create table if not exists companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  sector              text,
  about               text,
  tags                text[] not null default '{}',
  is_legacy_recruiter boolean not null default false,
  logo_url            text,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Jobs. is_open = false means draft, invisible to students.
--    extra_fields is for v2 -- a company asking something beyond the
--    standard template. Format:
--    [{"key":"notice_period","label":"Notice period (days)","type":"number"}]
-- ---------------------------------------------------------------------
create table if not exists jobs (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies on delete cascade,
  title                text not null,
  description          text,
  location             text,
  jd_path              text,
  min_experience_years numeric(4,1),
  deadline             timestamptz,
  is_open              boolean not null default false,
  extra_fields         jsonb not null default '[]',
  created_at           timestamptz not null default now()
);
create index if not exists jobs_company_idx on jobs (company_id);

-- ---------------------------------------------------------------------
-- 6. Applications. One per student per job.
-- ---------------------------------------------------------------------
create table if not exists applications (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references jobs on delete cascade,
  student_id uuid not null references students on delete cascade,
  cv_id      uuid not null references cvs,
  answers    jsonb not null default '{}',
  applied_at timestamptz not null default now(),
  unique (job_id, student_id)
);
create index if not exists applications_job_idx on applications (job_id);
create index if not exists applications_student_idx on applications (student_id);


-- =====================================================================
-- HELPERS
-- =====================================================================

-- security definer so RLS policies can call it without recursing into
-- the students table policies.
create or replace function is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select is_admin from students where id = auth.uid()), false);
$$;

-- On signup: look the email up in the allowlist. Not there -> reject.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare a allowed_students%rowtype;
begin
  select * into a from allowed_students where lower(email) = lower(new.email);
  if not found then
    raise exception 'Email % is not on the placement list. Contact a placement rep.', new.email;
  end if;

  insert into students (id, email, name, roll_no, total_experience_years, is_admin)
  values (new.id, lower(new.email), a.name, a.roll_no, a.total_experience_years, a.is_admin)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Students may edit phone / linkedin only. Everything else -- especially
-- is_admin and total_experience_years, which gates eligibility -- is
-- silently reverted unless an admin is making the change.
create or replace function guard_student_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_admin() then
    new.is_admin               := old.is_admin;
    new.email                  := old.email;
    new.name                   := old.name;
    new.roll_no                := old.roll_no;
    new.total_experience_years := old.total_experience_years;
    new.college                := old.college;
    new.degree                 := old.degree;
    new.specialization         := old.specialization;
  end if;
  return new;
end;
$$;

drop trigger if exists students_guard on students;
create trigger students_guard
  before update on students
  for each row execute function guard_student_update();

-- Refuse applications past the deadline, on a closed job, or below the
-- experience bar. Enforced in the DB so a stale browser tab cannot bypass it.
create or replace function guard_application()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare j jobs%rowtype; exp numeric;
begin
  select * into j from jobs where id = new.job_id;
  if not found then raise exception 'Job not found.'; end if;

  if not is_admin() then
    if not j.is_open then
      raise exception 'This job is not open for applications.';
    end if;
    if j.deadline is not null and now() > j.deadline then
      raise exception 'The deadline for this job has passed.';
    end if;
    select total_experience_years into exp from students where id = new.student_id;
    if j.min_experience_years is not null
       and coalesce(exp, 0) < j.min_experience_years then
      raise exception 'You do not meet the minimum experience requirement.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists applications_guard on applications;
create trigger applications_guard
  before insert on applications
  for each row execute function guard_application();


-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table allowed_students enable row level security;
alter table students         enable row level security;
alter table cvs              enable row level security;
alter table companies        enable row level security;
alter table jobs             enable row level security;
alter table applications     enable row level security;

drop policy if exists allowlist_admin       on allowed_students;
drop policy if exists students_select       on students;
drop policy if exists students_update_own   on students;
drop policy if exists students_admin        on students;
drop policy if exists cvs_own               on cvs;
drop policy if exists companies_read        on companies;
drop policy if exists companies_admin       on companies;
drop policy if exists jobs_read             on jobs;
drop policy if exists jobs_admin            on jobs;
drop policy if exists applications_select   on applications;
drop policy if exists applications_insert   on applications;
drop policy if exists applications_delete   on applications;
drop policy if exists applications_admin    on applications;

create policy allowlist_admin on allowed_students
  for all using (is_admin()) with check (is_admin());

create policy students_select on students
  for select to authenticated using (id = auth.uid() or is_admin());
create policy students_update_own on students
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy students_admin on students
  for all to authenticated using (is_admin()) with check (is_admin());

create policy cvs_own on cvs
  for all to authenticated
  using (student_id = auth.uid() or is_admin())
  with check (student_id = auth.uid() or is_admin());

create policy companies_read on companies
  for select to authenticated using (true);
create policy companies_admin on companies
  for all to authenticated using (is_admin()) with check (is_admin());

create policy jobs_read on jobs
  for select to authenticated using (is_open or is_admin());
create policy jobs_admin on jobs
  for all to authenticated using (is_admin()) with check (is_admin());

create policy applications_select on applications
  for select to authenticated using (student_id = auth.uid() or is_admin());
create policy applications_insert on applications
  for insert to authenticated with check (student_id = auth.uid());
create policy applications_delete on applications
  for delete to authenticated using (student_id = auth.uid() or is_admin());
create policy applications_admin on applications
  for all to authenticated using (is_admin()) with check (is_admin());


-- =====================================================================
-- STORAGE
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('jds', 'jds', false)
on conflict (id) do nothing;

drop policy if exists cv_insert_own   on storage.objects;
drop policy if exists cv_select_own   on storage.objects;
drop policy if exists cv_delete_own   on storage.objects;
drop policy if exists jd_select_auth  on storage.objects;
drop policy if exists jd_admin_write  on storage.objects;

-- CV paths must be  {student_uuid}/{filename}.pdf
create policy cv_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy cv_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs'
         and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

create policy cv_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy jd_select_auth on storage.objects
  for select to authenticated using (bucket_id = 'jds');

create policy jd_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'jds' and is_admin())
  with check (bucket_id = 'jds' and is_admin());


-- =====================================================================
-- EXPORT VIEW
-- Columns match the company template exactly. Admin export reads this,
-- filtered by job_id, and writes it straight to .xlsx.
-- =====================================================================

create or replace view application_export
with (security_invoker = on) as
select
  a.job_id,
  row_number() over (partition by a.job_id order by a.applied_at) as "S. No.",
  s.name                                                          as "Name",
  s.roll_no                                                       as "Roll No.",
  s.college                                                       as "College Name",
  s.degree                                                        as "Degree Name",
  s.specialization                                                as "Specialization",
  s.total_experience_years                                        as "Total Years of Experience",
  c.file_path                                                     as cv_path,
  c.label                                                         as cv_label,
  a.applied_at
from applications a
join students s on s.id = a.student_id
join cvs      c on c.id = a.cv_id;


-- =====================================================================
-- R2 -- COMMUNICATION LAYER
--
-- Everything below this line documents schema_r2.sql, the migration
-- that was actually pasted into the Supabase SQL editor and run. An
-- earlier version of this section described a different, more elaborate
-- R2 design (a category column on announcements, author_id stamped by
-- the insert trigger, a status_changed_at column on applications, a
-- pin-cap and reply-depth guard) that was drafted here but never
-- actually applied to the database -- schema_r2.sql was written and run
-- independently. That gap caused real, live bugs: posting an
-- announcement or a comment failed outright (nothing stamped author_id,
-- so the insert violated the not-null column and the RLS check alike),
-- and every page that read applications.status_changed_at or
-- announcements.category broke on a "column does not exist" error. The
-- app code has since been fixed to match what's below; keep this file
-- in sync with whatever actually gets pasted into the SQL editor next,
-- rather than drafting ahead of it here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 7. Application status. No enforced sequence between statuses -- a
--    placement rep can set any of the five at any time. There is no
--    status_changed_at column on applications; that value is derived by
--    the app from application_status_history.changed_at instead (see
--    lib/application-status.ts), falling back to applied_at when a
--    status has never changed.
-- ---------------------------------------------------------------------
alter table applications
  add column if not exists status text not null default 'applied';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'applications_status_check'
  ) then
    alter table applications add constraint applications_status_check
      check (status in ('applied', 'shortlisted', 'in_process', 'offer', 'not_selected'));
  end if;
end $$;

create table if not exists application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  from_status    text,
  to_status      text not null,
  changed_by     uuid references students,
  changed_at     timestamptz not null default now()
);
create index if not exists ash_application_idx
  on application_status_history (application_id);

-- Logs every status change automatically; does not touch a
-- status_changed_at column since applications doesn't have one.
create or replace function log_status_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into application_status_history
      (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists applications_log_status on applications;
create trigger applications_log_status
  after update on applications
  for each row execute function log_status_change();

-- Only admins may change status. In practice applications_admin (R1,
-- above) is the only policy that grants an UPDATE at all, so the "not
-- admin" branch here is a second line of defense, not the only one.
-- Students still withdraw by deleting their row, never by updating it.
create or replace function guard_application_update()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if not is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists applications_guard_update on applications;
create trigger applications_guard_update
  before update on applications
  for each row execute function guard_application_update();

alter table application_status_history enable row level security;

drop policy if exists ash_select on application_status_history;
drop policy if exists ash_admin  on application_status_history;

-- A student may read the history of their own applications, not just
-- admins -- lib/application-status.ts relies on this to compute "last
-- updated" on the student-facing /applications and /jobs/[id] pages.
create policy ash_select on application_status_history
  for select to authenticated
  using (
    is_admin() or exists (
      select 1 from applications ap
      where ap.id = application_status_history.application_id
        and ap.student_id = auth.uid()
    )
  );

create policy ash_admin on application_status_history
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 8. Announcements. Students may submit; only admins can post directly
--    or moderate a submission into 'approved'. There is no category
--    column -- an earlier draft of this schema added one, and the app
--    briefly read/wrote it, but it was never applied here, so that code
--    was reverted. If a category feature comes back, it needs both a
--    real ALTER TABLE run against this database and the app code redone
--    together, not one without the other.
-- ---------------------------------------------------------------------
create table if not exists announcements (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references students on delete cascade,
  title            text not null,
  body             text not null,
  status           text not null default 'pending',
  rejection_reason text,
  is_pinned        boolean not null default false,
  comments_locked  boolean not null default false,
  attachment_path  text,
  company_id       uuid references companies on delete set null,
  job_id           uuid references jobs on delete set null,
  published_at     timestamptz,
  created_at       timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'announcements_status_check'
  ) then
    alter table announcements add constraint announcements_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists announcements_status_idx
  on announcements (status, published_at desc);

-- A student may not self-approve or self-pin. Force both on insert and
-- on update, and stamp published_at the first time a post is approved.
-- Unlike an earlier draft of this function, this does NOT stamp
-- author_id -- the app sets it explicitly on insert (see
-- lib/announcements/actions.ts) precisely because this trigger doesn't.
-- There is also no pin-cap or reply-depth limit enforced here; those
-- were part of the never-applied draft too.
create or replace function guard_announcement()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if not is_admin() then
    new.status    := 'pending';
    new.is_pinned := false;
  end if;

  if new.status = 'approved' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists announcements_guard on announcements;
create trigger announcements_guard
  before insert or update on announcements
  for each row execute function guard_announcement();

-- ---------------------------------------------------------------------
-- 9. Comments. No enforced nesting-depth limit -- the app's own UI only
--    ever offers "reply" on a top-level comment, so a second-level reply
--    is never produced by the UI, but the database itself would allow one.
-- ---------------------------------------------------------------------
create table if not exists comments (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements on delete cascade,
  author_id       uuid not null references students on delete cascade,
  parent_id       uuid references comments on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists comments_announcement_idx
  on comments (announcement_id, created_at);

-- No commenting on a locked or unapproved announcement. Like
-- guard_announcement above, this does NOT stamp author_id -- the app
-- sets it explicitly on insert.
create or replace function guard_comment()
returns trigger language plpgsql security definer
set search_path = public as $$
declare a announcements%rowtype;
begin
  select * into a from announcements where id = new.announcement_id;
  if not found then raise exception 'Announcement not found.'; end if;

  if not is_admin() then
    if a.status <> 'approved' then
      raise exception 'This announcement is not open for comments.';
    end if;
    if a.comments_locked then
      raise exception 'Comments are closed on this announcement.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_guard on comments;
create trigger comments_guard
  before insert on comments
  for each row execute function guard_comment();

alter table announcements enable row level security;
alter table comments      enable row level security;

drop policy if exists announcements_select on announcements;
drop policy if exists announcements_insert on announcements;
drop policy if exists announcements_update on announcements;
drop policy if exists announcements_delete on announcements;

-- Approved posts are visible to everyone signed in. You always see your
-- own, whatever its status. Admins see everything, including the queue.
create policy announcements_select on announcements
  for select to authenticated
  using (status = 'approved' or author_id = auth.uid() or is_admin());

-- You may only create a post authored by you.
create policy announcements_insert on announcements
  for insert to authenticated
  with check (author_id = auth.uid());

-- A student may edit their own post while it's still pending (no app UI
-- for this yet, but the database already allows it); an admin may edit
-- any post at any time.
create policy announcements_update on announcements
  for update to authenticated
  using (is_admin() or (author_id = auth.uid() and status = 'pending'))
  with check (is_admin() or (author_id = auth.uid() and status = 'pending'));

create policy announcements_delete on announcements
  for delete to authenticated
  using (is_admin() or author_id = auth.uid());

drop policy if exists comments_select on comments;
drop policy if exists comments_insert on comments;
drop policy if exists comments_delete on comments;

create policy comments_select on comments
  for select to authenticated
  using (
    is_admin() or exists (
      select 1 from announcements a
      where a.id = comments.announcement_id and a.status = 'approved'
    )
  );

create policy comments_insert on comments
  for insert to authenticated
  with check (author_id = auth.uid());

create policy comments_delete on comments
  for delete to authenticated
  using (is_admin() or author_id = auth.uid());

-- The bucket is named 'announcements', not 'announcement-attachments' --
-- an earlier draft used the latter name and the app briefly matched that
-- draft instead of this bucket, so every attachment upload and every
-- "view attachment" link 404'd until the app was corrected to match.
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', false)
on conflict (id) do nothing;

drop policy if exists ann_read_auth   on storage.objects;
drop policy if exists ann_write_auth  on storage.objects;
drop policy if exists ann_delete_admin on storage.objects;

create policy ann_read_auth on storage.objects
  for select to authenticated using (bucket_id = 'announcements');

-- No folder-prefix restriction, unlike the cvs/jds buckets -- any
-- authenticated user can write anywhere in this bucket. The app always
-- writes to {author_uuid}/{uuid}.pdf by convention, but that convention
-- isn't enforced by a policy here the way cv_insert_own enforces it.
create policy ann_write_auth on storage.objects
  for insert to authenticated with check (bucket_id = 'announcements');

-- Only an admin can delete -- so lib/announcements/actions.ts's
-- best-effort cleanup of an orphaned upload (after a failed table
-- insert) silently no-ops for a non-admin author; the file is left
-- behind rather than deleted. Not a correctness bug, just a known
-- leak on an already-rare failure path.
create policy ann_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'announcements' and is_admin());

-- ---------------------------------------------------------------------
-- 10. Events. Job deadlines are NOT stored here -- they're derived live
--     from jobs.deadline at read time. This table only holds
--     admin-created events. 'deadline' is a valid type value (the check
--     constraint allows it) but the app's own create-event form never
--     offers it -- it's reserved for how the app *renders* a derived
--     jobs.deadline entry on the calendar, never a row actually stored
--     here.
-- ---------------------------------------------------------------------
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        text not null default 'other',
  company_id  uuid references companies on delete cascade,
  job_id      uuid references jobs on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  venue       text,
  link        text,
  visibility  text not null default 'all',
  created_by  uuid references students,
  created_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_type_check') then
    alter table events add constraint events_type_check
      check (type in ('ppt', 'test', 'interview', 'deadline', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_visibility_check') then
    alter table events add constraint events_visibility_check
      check (visibility in ('all', 'shortlisted'));
  end if;
end $$;

create index if not exists events_starts_idx on events (starts_at);

-- created_by and ends_at are both nullable here, and there is no insert
-- trigger stamping created_by the way guard_application/guard_comment
-- stamp their own author columns -- admin/events/actions.ts sets
-- created_by explicitly for that reason. The app's own form always
-- requires an end time, so ends_at is never actually null in practice,
-- but the column itself doesn't require it.
create or replace function is_shortlisted_for(p_job_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from applications
    where job_id = p_job_id
      and student_id = auth.uid()
      and status in ('shortlisted', 'in_process', 'offer')
  );
$$;

alter table events enable row level security;

drop policy if exists events_select on events;
drop policy if exists events_admin  on events;

create policy events_select on events
  for select to authenticated
  using (
    is_admin()
    or visibility = 'all'
    or (visibility = 'shortlisted'
        and job_id is not null
        and is_shortlisted_for(job_id))
  );

create policy events_admin on events
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 11. Notifications. Table now, delivery UI later (PRD 5.2). Rows land
--     here -- e.g. one per student on a bulk shortlist confirm -- ready
--     for an eventual in-app/email surface that doesn't exist yet.
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references students on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on notifications (user_id, read_at, created_at desc);

-- Unused by the app so far -- no UI reads or writes it yet.
alter table students
  add column if not exists email_notifications boolean not null default true;

alter table notifications enable row level security;

drop policy if exists notifications_select on notifications;
drop policy if exists notifications_update on notifications;
drop policy if exists notifications_admin  on notifications;

create policy notifications_select on notifications
  for select to authenticated using (user_id = auth.uid());

-- A student may mark their own notifications read (no app UI for this
-- yet either, but the database already allows it).
create policy notifications_update on notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_admin on notifications
  for all to authenticated
  using (is_admin()) with check (is_admin());


-- =====================================================================
-- DIRECTORY VIEW
--
-- The announcements and home-page feeds resolve "who wrote this" for
-- posts and comments authored by someone other than the viewer by
-- querying student_names, a view that exposes just id + name. Without
-- it, students_select's own-row-only restriction (R1, above) means a
-- regular student's query for another author's name returns nothing,
-- and every such name silently falls back to "Unknown" in the UI. This
-- view was part of the earlier, never-applied R2 draft along with
-- everything above it in this file, but the app was built assuming it
-- exists and queries it regardless -- rather than reverting that code,
-- this one piece of the draft was applied on its own, separately from
-- schema_r2.sql, since there's no other reasonable way to serve this
-- lookup without reaching for the service-role key in application code
-- (which CLAUDE.md's rules reserve for cases RLS genuinely can't
-- express -- a security-definer view is the more idiomatic fix here).
-- =====================================================================

-- No security_invoker here on purpose -- students_select only lets a
-- student read their own row, and this view intentionally runs with the
-- owner's privileges so that restriction doesn't apply to it.
create or replace view student_names as
select id, name from students;

grant select on student_names to authenticated;
