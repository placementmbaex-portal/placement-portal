-- =====================================================================
-- IIM Calcutta MBAEx Placement Portal -- schema v1
-- Paste the whole file into the Supabase SQL Editor and hit Run.
-- Safe to re-run: everything is guarded.
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
-- R2 5.1 -- ANNOUNCEMENTS & COMMENTS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 7. Announcements. Students may submit; only admins can post directly
--    (status starts 'approved') or moderate a submission into that state.
-- ---------------------------------------------------------------------
create table if not exists announcements (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references students on delete cascade,
  title             text not null,
  body              text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  rejection_reason  text,
  is_pinned         boolean not null default false,
  attachment_path   text,
  company_id        uuid references companies on delete set null,
  job_id            uuid references jobs on delete set null,
  comments_locked   boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists announcements_status_idx on announcements (status);
create index if not exists announcements_feed_idx
  on announcements (is_pinned desc, published_at desc);

-- ---------------------------------------------------------------------
-- 8. Comments. Threaded one level deep: a reply's parent must itself be
--    a top-level comment on the same announcement.
-- ---------------------------------------------------------------------
create table if not exists comments (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements on delete cascade,
  author_id       uuid not null references students on delete cascade,
  parent_id       uuid references comments on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists comments_announcement_idx on comments (announcement_id);

-- ---------------------------------------------------------------------
-- Directory: exposes just id + name so any signed-in user can show
-- "who wrote this" on an announcement or comment authored by someone
-- else. No security_invoker here on purpose -- students_select only
-- lets a student read their own row, and this view intentionally runs
-- with the owner's privileges so that restriction doesn't apply to it.
-- ---------------------------------------------------------------------
create or replace view student_names as
select id, name from students;

grant select on student_names to authenticated;

-- Force author_id to the caller and, for non-admins, force every
-- moderation-only field back to submission defaults regardless of what
-- was posted. Admins posting directly get published_at stamped on approval.
create or replace function guard_announcement_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.author_id := auth.uid();

  if not is_admin() then
    new.status           := 'pending';
    new.rejection_reason := null;
    new.is_pinned        := false;
    new.comments_locked  := false;
    new.published_at     := null;
  elsif coalesce(new.status, 'pending') = 'approved' then
    new.status       := 'approved';
    new.published_at := coalesce(new.published_at, now());
  else
    new.status := coalesce(new.status, 'pending');
  end if;

  return new;
end;
$$;

drop trigger if exists announcements_guard_insert on announcements;
create trigger announcements_guard_insert
  before insert on announcements
  for each row execute function guard_announcement_insert();

-- Only admins can reach an update at all (see announcements_admin below),
-- but this still enforces the business rules: a rejection needs a reason,
-- approving stamps published_at and clears any stale reason, only an
-- approved announcement can be pinned, and at most 3 may be pinned at once.
create or replace function guard_announcement_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare pinned_count int;
begin
  if not is_admin() then
    return old;
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    new.published_at := coalesce(new.published_at, now());
    new.rejection_reason := null;
  end if;

  if new.status = 'rejected' and new.rejection_reason is null then
    raise exception 'A rejection needs a reason.';
  end if;

  if new.status <> 'approved' then
    new.is_pinned := false;
  end if;

  if new.is_pinned and not old.is_pinned then
    select count(*) into pinned_count
    from announcements
    where is_pinned and id <> new.id;

    if pinned_count >= 3 then
      raise exception 'You can pin at most 3 announcements. Unpin one first.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists announcements_guard_update on announcements;
create trigger announcements_guard_update
  before update on announcements
  for each row execute function guard_announcement_update();

-- Refuses a comment if the announcement isn't published, comments are
-- locked, or the reply would be nested more than one level deep.
create or replace function guard_comment_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  a      announcements%rowtype;
  parent comments%rowtype;
begin
  new.author_id := auth.uid();

  select * into a from announcements where id = new.announcement_id;
  if not found then
    raise exception 'Announcement not found.';
  end if;
  if a.status <> 'approved' then
    raise exception 'You can only comment on published announcements.';
  end if;
  if a.comments_locked then
    raise exception 'Comments are locked on this announcement.';
  end if;

  if new.parent_id is not null then
    select * into parent from comments where id = new.parent_id;
    if not found or parent.announcement_id <> new.announcement_id then
      raise exception 'Invalid parent comment.';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies can only be one level deep.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_guard_insert on comments;
create trigger comments_guard_insert
  before insert on comments
  for each row execute function guard_comment_insert();

alter table announcements enable row level security;
alter table comments      enable row level security;

drop policy if exists announcements_select on announcements;
drop policy if exists announcements_insert on announcements;
drop policy if exists announcements_admin  on announcements;
drop policy if exists comments_select      on comments;
drop policy if exists comments_insert      on comments;
drop policy if exists comments_delete      on comments;
drop policy if exists comments_admin       on comments;

create policy announcements_select on announcements
  for select to authenticated
  using (status = 'approved' or author_id = auth.uid() or is_admin());
create policy announcements_insert on announcements
  for insert to authenticated with check (author_id = auth.uid());
create policy announcements_admin on announcements
  for all to authenticated using (is_admin()) with check (is_admin());

create policy comments_select on comments
  for select to authenticated
  using (
    exists (
      select 1 from announcements a
      where a.id = comments.announcement_id
        and (a.status = 'approved' or a.author_id = auth.uid() or is_admin())
    )
  );
create policy comments_insert on comments
  for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on comments
  for delete to authenticated using (author_id = auth.uid());
create policy comments_admin on comments
  for all to authenticated using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('announcement-attachments', 'announcement-attachments', false)
on conflict (id) do nothing;

drop policy if exists announcement_attachment_insert_own  on storage.objects;
drop policy if exists announcement_attachment_select_auth on storage.objects;

-- Announcement attachment paths must be {author_uuid}/{filename}.pdf
create policy announcement_attachment_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'announcement-attachments'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy announcement_attachment_select_auth on storage.objects
  for select to authenticated using (bucket_id = 'announcement-attachments');


-- =====================================================================
-- R2 5.3 -- APPLICATION STATUS
-- No enforced sequence between statuses -- a placerep can set any of the
-- five at any time, same trust-the-admin approach as the rest of R1.
-- =====================================================================

alter table applications
  add column if not exists status text not null default 'applied'
    check (status in ('applied', 'shortlisted', 'in_process', 'offer', 'not_selected')),
  add column if not exists status_changed_at timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 9. Application status history. Admin-only audit trail; students see
--    only the current status + status_changed_at on applications itself.
-- ---------------------------------------------------------------------
create table if not exists application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  from_status    text,
  to_status      text not null,
  changed_by     uuid not null references students,
  changed_at     timestamptz not null default now()
);
create index if not exists application_status_history_app_idx
  on application_status_history (application_id);

-- Only admins can reach an applications UPDATE at all (applications_admin
-- below is the only policy that grants it), so this fires solely on
-- admin-initiated status changes -- single or bulk, one row at a time.
create or replace function guard_application_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    insert into application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists applications_guard_status on applications;
create trigger applications_guard_status
  before update on applications
  for each row execute function guard_application_status();

alter table application_status_history enable row level security;

drop policy if exists application_status_history_admin on application_status_history;

create policy application_status_history_admin on application_status_history
  for select to authenticated using (is_admin());


-- =====================================================================
-- R2 5.4 -- BULK SHORTLIST UPLOAD (notifications, minimal)
-- Full in-app/email delivery is 5.2, not built yet. This is just enough
-- of the notifications table for 5.4's "fires once per student" criterion
-- to be real: rows land here, ready for 5.2 to eventually surface them.
-- =====================================================================

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
create index if not exists notifications_user_idx on notifications (user_id);

alter table notifications enable row level security;

drop policy if exists notifications_select on notifications;
drop policy if exists notifications_admin  on notifications;

create policy notifications_select on notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_admin on notifications
  for all to authenticated using (is_admin()) with check (is_admin());


-- =====================================================================
-- R2 5.5 -- CALENDAR
-- Job deadlines are NOT stored here -- they're derived live from
-- jobs.deadline at read time (that's what "no admin has to duplicate
-- them" and "updates when a deadline moves" mean). This table only holds
-- admin-created events: ppt/test/interview/other. 'deadline' is a type
-- the app renders for the derived entries, never a row here.
-- =====================================================================

create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  type       text not null check (type in ('ppt', 'test', 'interview', 'other')),
  company_id uuid references companies on delete set null,
  job_id     uuid references jobs on delete set null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  venue      text,
  link       text,
  visibility text not null default 'all' check (visibility in ('all', 'shortlisted')),
  created_by uuid not null references students,
  created_at timestamptz not null default now(),
  check (venue is not null or link is not null),
  check (visibility <> 'shortlisted' or job_id is not null),
  check (ends_at >= starts_at)
);
create index if not exists events_starts_at_idx on events (starts_at);

create or replace function guard_event_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists events_guard_insert on events;
create trigger events_guard_insert
  before insert on events
  for each row execute function guard_event_insert();

alter table events enable row level security;

drop policy if exists events_select on events;
drop policy if exists events_admin  on events;

-- The one new RLS shape per the PRD: visible if visibility is 'all', or
-- the viewer holds a shortlisted-or-beyond application for the linked job.
create policy events_select on events
  for select to authenticated
  using (
    visibility = 'all'
    or is_admin()
    or exists (
      select 1 from applications a
      where a.job_id = events.job_id
        and a.student_id = auth.uid()
        and a.status in ('shortlisted', 'in_process', 'offer')
    )
  );

create policy events_admin on events
  for all to authenticated using (is_admin()) with check (is_admin());
