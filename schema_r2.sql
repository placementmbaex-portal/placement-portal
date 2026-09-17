-- =====================================================================
-- Placement Portal -- R2 schema (communication layer)
--
-- Safe to run on a database that already has some of this. Every
-- statement is guarded, so it creates what is missing and leaves
-- existing objects alone. Paste the whole file into the Supabase
-- SQL Editor and Run.
--
-- Requires the R1 schema (students, cvs, companies, jobs, applications).
-- =====================================================================


-- =====================================================================
-- 1. APPLICATION STATUS  (PRD 5.3)
-- =====================================================================

alter table applications
  add column if not exists status text not null default 'applied';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'applications_status_check'
  ) then
    alter table applications add constraint applications_status_check
      check (status in ('applied','shortlisted','in_process','offer','not_selected'));
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

-- Log every status change automatically.
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

-- Only admins may change status. Students may still withdraw (delete).
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


-- =====================================================================
-- 2. ANNOUNCEMENTS  (PRD 5.1)
-- =====================================================================

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
      check (status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists announcements_status_idx
  on announcements (status, published_at desc);

-- A student may not self-approve or self-pin. Force both on insert,
-- and stop a student editing their way to approved afterwards.
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


-- =====================================================================
-- 3. COMMENTS  (PRD 5.1)
-- =====================================================================

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

-- No commenting on a locked or unapproved announcement.
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


-- =====================================================================
-- 4. EVENTS  (PRD 5.5)
-- =====================================================================

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
      check (type in ('ppt','test','interview','deadline','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_visibility_check') then
    alter table events add constraint events_visibility_check
      check (visibility in ('all','shortlisted'));
  end if;
end $$;

create index if not exists events_starts_idx on events (starts_at);

-- Helper: is the current user shortlisted (or beyond) for this job?
create or replace function is_shortlisted_for(p_job_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from applications
    where job_id = p_job_id
      and student_id = auth.uid()
      and status in ('shortlisted','in_process','offer')
  );
$$;


-- =====================================================================
-- 5. NOTIFICATIONS  (PRD 5.2 -- table now, delivery later)
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
create index if not exists notifications_user_idx
  on notifications (user_id, read_at, created_at desc);

alter table students
  add column if not exists email_notifications boolean not null default true;


-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================================

alter table announcements              enable row level security;
alter table comments                   enable row level security;
alter table events                     enable row level security;
alter table notifications              enable row level security;
alter table application_status_history enable row level security;

drop policy if exists announcements_select on announcements;
drop policy if exists announcements_insert on announcements;
drop policy if exists announcements_update on announcements;
drop policy if exists announcements_delete on announcements;

-- Approved posts are visible to everyone signed in. You always see your
-- own, whatever its status. Admins see everything, including the queue.
create policy announcements_select on announcements
  for select to authenticated
  using (status = 'approved' or author_id = auth.uid() or is_admin());

-- You may only create a post authored by you. The trigger above forces
-- it to 'pending' unless you are an admin.
create policy announcements_insert on announcements
  for insert to authenticated
  with check (author_id = auth.uid());

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


drop policy if exists events_select on events;
drop policy if exists events_admin  on events;

-- A restricted event is invisible unless you are actually in that process.
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
  for all to authenticated
  using (is_admin()) with check (is_admin());


drop policy if exists notifications_select on notifications;
drop policy if exists notifications_update on notifications;
drop policy if exists notifications_admin  on notifications;

create policy notifications_select on notifications
  for select to authenticated using (user_id = auth.uid());

-- Students may only mark their own as read.
create policy notifications_update on notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_admin on notifications
  for all to authenticated
  using (is_admin()) with check (is_admin());


drop policy if exists ash_select on application_status_history;
drop policy if exists ash_admin  on application_status_history;

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


-- =====================================================================
-- 7. STORAGE -- announcement attachments
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', false)
on conflict (id) do nothing;

drop policy if exists ann_read_auth   on storage.objects;
drop policy if exists ann_write_auth  on storage.objects;
drop policy if exists ann_delete_admin on storage.objects;

create policy ann_read_auth on storage.objects
  for select to authenticated using (bucket_id = 'announcements');

create policy ann_write_auth on storage.objects
  for insert to authenticated with check (bucket_id = 'announcements');

create policy ann_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'announcements' and is_admin());


-- =====================================================================
-- 8. VERIFY -- read the output of these two
-- =====================================================================

-- Every row must say true.
select tablename, rowsecurity as rls_on
from pg_tables
where schemaname = 'public'
order by tablename;

-- Nothing should show 0.
select t.tablename, count(p.policyname) as policies
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename
order by policies asc, t.tablename;
