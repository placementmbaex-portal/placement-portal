-- =====================================================================
-- Placement Portal -- R4 schema (deletion semantics)
--
-- Safe to run repeatedly. Requires schema.sql, schema_r2.sql, schema_r3.sql.
-- Run the verification queries at the bottom SEPARATELY -- the SQL editor
-- only displays the last result set.
-- =====================================================================


-- =====================================================================
-- 1. ANNOUNCEMENT SOFT DELETE
-- =====================================================================

alter table announcements add column if not exists deleted_at timestamptz;
alter table announcements add column if not exists deleted_by uuid references students;

create index if not exists announcements_live_idx on announcements (deleted_at);

-- Deleted announcements disappear for everyone, admins included.
-- They are reachable only through the trash view, which queries with
-- the service role key.
drop policy if exists announcements_select on announcements;
create policy announcements_select on announcements
  for select to authenticated
  using (
    deleted_at is null
    and (status = 'approved' or author_id = auth.uid() or is_admin())
  );

-- Comments on a deleted announcement vanish with it.
drop policy if exists comments_select on comments;
create policy comments_select on comments
  for select to authenticated
  using (
    exists (
      select 1 from announcements a
      where a.id = comments.announcement_id
        and a.deleted_at is null
        and (a.status = 'approved' or is_admin())
    )
  );


-- =====================================================================
-- 2. JOB VISIBILITY -- fixes a real bug
--
-- The old policy was (deleted_at is null and is_open) or is_admin().
-- That meant a student who applied to a job could no longer see it once
-- it closed, so their own application history broke.
--
-- Three distinct states now:
--   is_open = false        -> closed. Applicants still see it in history.
--   deleted_at set         -> hidden from every student, applicants too.
--   row deleted            -> gone, with applications, irreversibly.
-- =====================================================================

drop policy if exists jobs_read on jobs;
create policy jobs_read on jobs
  for select to authenticated
  using (
    is_admin()
    or (
      deleted_at is null
      and (
        is_open
        or exists (
          select 1 from applications a
          where a.job_id = jobs.id and a.student_id = auth.uid()
        )
      )
    )
  );

-- Applications against a soft-deleted job disappear from the student's
-- view too, so nothing dangles.
drop policy if exists applications_select on applications;
create policy applications_select on applications
  for select to authenticated
  using (
    is_admin()
    or (
      student_id = auth.uid()
      and exists (
        select 1 from jobs j where j.id = applications.job_id and j.deleted_at is null
      )
    )
  );

-- Events belonging to a deleted job likewise.
drop policy if exists events_select on events;
create policy events_select on events
  for select to authenticated
  using (
    is_admin()
    or (
      (job_id is null or exists (
        select 1 from jobs j where j.id = events.job_id and j.deleted_at is null
      ))
      and (
        visibility = 'all'
        or (visibility = 'shortlisted' and job_id is not null and is_shortlisted_for(job_id))
      )
    )
  );


-- =====================================================================
-- 3. DELETION LOG
--
-- A permanent delete destroys rows. This keeps a record of what was
-- destroyed, including a jsonb snapshot, so the committee can answer
-- "what happened to the Deloitte role" six weeks later.
-- =====================================================================

create table if not exists deletion_log (
  id                     uuid primary key default gen_random_uuid(),
  entity_type            text not null,
  entity_id              uuid not null,
  entity_label           text,
  applications_destroyed int  not null default 0,
  snapshot               jsonb,
  deleted_by             uuid references students,
  deleted_at             timestamptz not null default now()
);
create index if not exists deletion_log_at_idx on deletion_log (deleted_at desc);

alter table deletion_log enable row level security;
drop policy if exists deletion_log_admin on deletion_log;
create policy deletion_log_admin on deletion_log
  for all to authenticated using (is_admin()) with check (is_admin());


-- =====================================================================
-- 4. PERMANENT DELETE
--
-- Snapshots everything, writes the log, then deletes. Requires the
-- caller to retype the job title, so it cannot fire by accident.
-- =====================================================================

create or replace function permanently_delete_job(p_job_id uuid, p_confirm_title text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  j jobs%rowtype;
  app_count int;
  snap jsonb;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;

  select * into j from jobs where id = p_job_id;
  if not found then raise exception 'Job not found.'; end if;

  if lower(trim(p_confirm_title)) <> lower(trim(j.title)) then
    raise exception 'Confirmation text does not match the job title.';
  end if;

  select count(*) into app_count from applications where job_id = p_job_id;

  select jsonb_build_object(
    'job', to_jsonb(j),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'student_email', s.email,
        'student_name',  s.name,
        'roll_no',       s.roll_no,
        'status',        a.status,
        'applied_at',    a.applied_at
      ))
      from applications a join students s on s.id = a.student_id
      where a.job_id = p_job_id
    ), '[]'::jsonb)
  ) into snap;

  insert into deletion_log
    (entity_type, entity_id, entity_label, applications_destroyed, snapshot, deleted_by)
  values ('job', p_job_id, j.title, app_count, snap, auth.uid());

  delete from jobs where id = p_job_id;   -- cascades to applications and events

  return jsonb_build_object('deleted', true, 'applications_destroyed', app_count);
end;
$$;


create or replace function permanently_delete_company(p_company_id uuid, p_confirm_name text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  c companies%rowtype;
  job_count int; app_count int; snap jsonb;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;

  select * into c from companies where id = p_company_id;
  if not found then raise exception 'Company not found.'; end if;

  if lower(trim(p_confirm_name)) <> lower(trim(c.name)) then
    raise exception 'Confirmation text does not match the company name.';
  end if;

  select count(*) into job_count from jobs where company_id = p_company_id;
  select count(*) into app_count from applications a
    join jobs j on j.id = a.job_id where j.company_id = p_company_id;

  select jsonb_build_object(
    'company', to_jsonb(c),
    'jobs', coalesce((select jsonb_agg(to_jsonb(j)) from jobs j
                      where j.company_id = p_company_id), '[]'::jsonb)
  ) into snap;

  insert into deletion_log
    (entity_type, entity_id, entity_label, applications_destroyed, snapshot, deleted_by)
  values ('company', p_company_id, c.name, app_count, snap, auth.uid());

  delete from companies where id = p_company_id;

  return jsonb_build_object('deleted', true,
    'jobs_destroyed', job_count, 'applications_destroyed', app_count);
end;
$$;


create or replace function permanently_delete_announcement(p_id uuid)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare a announcements%rowtype; c_count int;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;

  select * into a from announcements where id = p_id;
  if not found then raise exception 'Announcement not found.'; end if;

  select count(*) into c_count from comments where announcement_id = p_id;

  insert into deletion_log
    (entity_type, entity_id, entity_label, applications_destroyed, snapshot, deleted_by)
  values ('announcement', p_id, a.title, 0,
          jsonb_build_object('announcement', to_jsonb(a), 'comment_count', c_count),
          auth.uid());

  delete from announcements where id = p_id;

  return jsonb_build_object('deleted', true, 'comments_destroyed', c_count);
end;
$$;


-- Extend the impact check to announcements.
create or replace function deletion_impact(p_kind text, p_id uuid)
returns jsonb language plpgsql security definer stable
set search_path = public as $$
declare result jsonb;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;

  if p_kind = 'job' then
    select jsonb_build_object(
      'applications', (select count(*) from applications where job_id = p_id),
      'events',       (select count(*) from events where job_id = p_id)
    ) into result;
  elsif p_kind = 'company' then
    select jsonb_build_object(
      'jobs',         (select count(*) from jobs where company_id = p_id),
      'applications', (select count(*) from applications a
                         join jobs j on j.id = a.job_id where j.company_id = p_id),
      'events',       (select count(*) from events where company_id = p_id)
    ) into result;
  elsif p_kind = 'announcement' then
    select jsonb_build_object(
      'comments', (select count(*) from comments where announcement_id = p_id)
    ) into result;
  else
    raise exception 'Unknown kind: %', p_kind;
  end if;

  return result;
end;
$$;


-- =====================================================================
-- 5. VERIFY -- run each separately
-- =====================================================================

-- select tablename, rowsecurity from pg_tables
-- where schemaname='public' order by tablename;

-- select tablename, policyname, cmd from pg_policies
-- where schemaname='public' and tablename in
--   ('jobs','applications','announcements','comments','events')
-- order by tablename, policyname;
