-- =====================================================================
-- Placement Portal -- R3 schema (admin controls + master data)
--
-- Safe to run repeatedly. Requires schema.sql and schema_r2.sql.
-- Paste into the Supabase SQL Editor and Run.
--
-- NOTE: the editor only shows the LAST result set. Run the two
-- verification queries at the bottom separately.
-- =====================================================================


-- =====================================================================
-- 1. PROFILE FIELD REGISTRY
--
-- Adding a profile field becomes a row here, not a migration.
-- Values live in students.profile as jsonb, keyed by field_key.
-- =====================================================================

create table if not exists profile_fields (
  field_key        text primary key,
  label            text not null,
  field_type       text not null default 'text',
  options          jsonb,              -- for select / multiselect
  section          text not null default 'Other',
  display_order    int  not null default 100,
  student_visible  boolean not null default true,
  student_editable boolean not null default false,
  required         boolean not null default false,
  include_in_export boolean not null default true,
  help_text        text,
  created_at       timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profile_fields_type_check') then
    alter table profile_fields add constraint profile_fields_type_check
      check (field_type in ('text','longtext','number','date','select','multiselect','boolean','email','phone','url'));
  end if;
end $$;

alter table students
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- Seed a sensible starting set. Edit or extend from the admin portal.
insert into profile_fields
  (field_key, label, field_type, section, display_order, student_visible, student_editable, options)
values
  -- Contact -- the student owns these
  ('phone',              'Phone',                  'phone',  'Contact',   10, true,  true,  null),
  ('alt_email',          'Alternate email',        'email',  'Contact',   20, true,  true,  null),
  ('linkedin',           'LinkedIn',               'url',    'Contact',   30, true,  true,  null),
  ('current_location',   'Current location',       'text',   'Contact',   40, true,  true,  null),

  -- Academics -- admin-owned master data
  ('tenth_board',        'Class X board',          'text',   'Academics', 10, true,  false, null),
  ('tenth_percentage',   'Class X %',              'number', 'Academics', 20, true,  false, null),
  ('tenth_year',         'Class X year',           'number', 'Academics', 30, true,  false, null),
  ('twelfth_board',      'Class XII board',        'text',   'Academics', 40, true,  false, null),
  ('twelfth_percentage', 'Class XII %',            'number', 'Academics', 50, true,  false, null),
  ('twelfth_year',       'Class XII year',         'number', 'Academics', 60, true,  false, null),
  ('ug_degree',          'UG degree',              'text',   'Academics', 70, true,  false, null),
  ('ug_institute',       'UG institute',           'text',   'Academics', 80, true,  false, null),
  ('ug_percentage',      'UG %',                   'number', 'Academics', 90, true,  false, null),
  ('ug_year',            'UG graduation year',     'number', 'Academics',100, true,  false, null),
  ('pg_degree',          'Prior PG degree',        'text',   'Academics',110, true,  false, null),
  ('pg_institute',       'Prior PG institute',     'text',   'Academics',120, true,  false, null),

  -- Experience
  ('current_employer',   'Current employer',       'text',   'Experience', 10, true, false, null),
  ('current_designation','Current designation',    'text',   'Experience', 20, true, false, null),
  ('prior_employers',    'Previous employers',     'longtext','Experience',30, true, true,  null),
  ('functional_area',    'Functional area',        'multiselect','Experience',40, true, true,
     '["Strategy","Consulting","Finance","Marketing","Operations","Technology","Product","Analytics","HR","Sales","General Management"]'),
  ('sector_experience',  'Sector experience',      'multiselect','Experience',50, true, true,
     '["BFSI","Consulting","IT/ITES","Manufacturing","FMCG","Healthcare","Energy","Retail","Telecom","Public Sector","Other"]'),
  ('certifications',     'Certifications',         'longtext','Experience', 60, true, true,  null),
  ('is_sponsored',       'Company sponsored',      'boolean','Experience', 70, true, false, null),
  ('notice_period_days', 'Notice period (days)',   'number', 'Experience', 80, true, true,  null),

  -- Preferences
  ('preferred_functions','Preferred functions',    'multiselect','Preferences',10, true, true,
     '["Strategy","Consulting","Finance","Marketing","Operations","Technology","Product","Analytics","General Management"]'),
  ('preferred_locations','Preferred locations',    'multiselect','Preferences',20, true, true,
     '["Mumbai","Delhi NCR","Bengaluru","Hyderabad","Chennai","Pune","Kolkata","Ahmedabad","Anywhere in India","International"]'),
  ('open_to_relocate',   'Open to relocation',     'boolean','Preferences', 30, true, true,  null),

  -- Admin only -- student_visible false keeps these off the profile page
  ('current_ctc',        'Current CTC (LPA)',      'number', 'Internal',   10, false, false, null),
  ('internal_notes',     'Committee notes',        'longtext','Internal',  20, false, false, null)
on conflict (field_key) do nothing;


-- =====================================================================
-- 2. SOFT DELETE for companies and jobs
--
-- A hard delete on a job cascades to applications and destroys the
-- application history. Soft delete keeps the record recoverable.
-- =====================================================================

alter table companies add column if not exists deleted_at timestamptz;
alter table companies add column if not exists deleted_by uuid references students;
alter table jobs      add column if not exists deleted_at timestamptz;
alter table jobs      add column if not exists deleted_by uuid references students;

create index if not exists companies_live_idx on companies (deleted_at);
create index if not exists jobs_live_idx      on jobs (deleted_at);

-- Students never see deleted records. Admins see them in a trash view.
drop policy if exists companies_read on companies;
create policy companies_read on companies
  for select to authenticated
  using (deleted_at is null or is_admin());

drop policy if exists jobs_read on jobs;
create policy jobs_read on jobs
  for select to authenticated
  using ((deleted_at is null and is_open) or is_admin());

-- What would a delete destroy? Call before confirming.
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
  else
    raise exception 'Unknown kind: %', p_kind;
  end if;

  return result;
end;
$$;


-- =====================================================================
-- 3. ADMIN MANAGEMENT + LAST LOGIN
-- =====================================================================

-- Supabase already records sign-ins in auth.users. This exposes it to
-- admins without granting access to the auth schema itself.
create or replace function admin_user_activity()
returns table (
  student_id     uuid,
  email          text,
  name           text,
  roll_no        text,
  is_admin       boolean,
  last_sign_in_at timestamptz,
  account_created timestamptz,
  cv_count       bigint,
  application_count bigint
)
language sql security definer stable
set search_path = public, auth as $$
  select
    s.id, s.email, s.name, s.roll_no, s.is_admin,
    u.last_sign_in_at, u.created_at,
    (select count(*) from cvs c where c.student_id = s.id),
    (select count(*) from applications a where a.student_id = s.id)
  from students s
  join auth.users u on u.id = s.id
  where is_admin()
  order by u.last_sign_in_at desc nulls last;
$$;

-- Students on the allowlist who have never signed in.
create or replace function admin_never_signed_in()
returns table (email text, name text, roll_no text)
language sql security definer stable
set search_path = public as $$
  select a.email, a.name, a.roll_no
  from allowed_students a
  left join students s on lower(s.email) = lower(a.email)
  where s.id is null and is_admin()
  order by a.name;
$$;

-- Replaces the R1 guard. Adds lockout protection so you cannot demote
-- yourself or remove the last remaining admin.
create or replace function guard_student_update()
returns trigger language plpgsql security definer
set search_path = public as $$
declare remaining int;
begin
  if not is_admin() then
    -- Students may edit nothing but the profile jsonb (filtered below)
    new.is_admin               := old.is_admin;
    new.email                  := old.email;
    new.name                   := old.name;
    new.roll_no                := old.roll_no;
    new.total_experience_years := old.total_experience_years;
    new.college                := old.college;
    new.degree                 := old.degree;
    new.specialization         := old.specialization;
  else
    if old.is_admin and not new.is_admin then
      if old.id = auth.uid() then
        raise exception 'You cannot remove your own admin access. Ask another admin.';
      end if;
      select count(*) into remaining from students where is_admin and id <> old.id;
      if remaining = 0 then
        raise exception 'Cannot remove the last admin.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists students_guard on students;
create trigger students_guard
  before update on students
  for each row execute function guard_student_update();


-- =====================================================================
-- 4. APP SETTINGS -- email test mode lives here, not in env vars,
--    so you can flip it without a deploy.
-- =====================================================================

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references students,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  -- 'off'  = send nothing
  -- 'test' = redirect every email to test_recipients
  -- 'live' = send to real recipients
  ('email_mode',         '"test"'::jsonb),
  ('email_test_recipients', '[]'::jsonb),
  ('email_from',         '"placements@yourdomain.com"'::jsonb),
  ('announcement_email_default', 'true'::jsonb)
on conflict (key) do nothing;

-- Per-announcement override of the default.
alter table announcements
  add column if not exists send_email boolean not null default true;

-- Record of what was actually sent or suppressed. Read this to confirm
-- test mode is doing what you think it is.
create table if not exists email_log (
  id            uuid primary key default gen_random_uuid(),
  to_email      text not null,
  intended_for  uuid references students,
  subject       text,
  status        text not null,   -- sent | suppressed | failed
  mode          text,            -- the email_mode at send time
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists email_log_created_idx on email_log (created_at desc);


-- =====================================================================
-- 5. RLS on the new tables
-- =====================================================================

alter table profile_fields enable row level security;
alter table app_settings   enable row level security;
alter table email_log      enable row level security;

drop policy if exists profile_fields_read  on profile_fields;
drop policy if exists profile_fields_admin on profile_fields;

-- Students need the registry to render their own profile page.
create policy profile_fields_read on profile_fields
  for select to authenticated using (true);
create policy profile_fields_admin on profile_fields
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists app_settings_admin on app_settings;
create policy app_settings_admin on app_settings
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists email_log_admin on email_log;
create policy email_log_admin on email_log
  for all to authenticated using (is_admin()) with check (is_admin());


-- =====================================================================
-- 6. PROFILE JSONB GUARD
--
-- A student may write only the keys marked student_editable. Without
-- this, anyone could PATCH current_ctc or internal_notes directly.
-- =====================================================================

create or replace function guard_profile_jsonb()
returns trigger language plpgsql security definer
set search_path = public as $$
declare k text; merged jsonb;
begin
  if is_admin() then
    return new;
  end if;

  merged := coalesce(old.profile, '{}'::jsonb);

  for k in select jsonb_object_keys(coalesce(new.profile, '{}'::jsonb))
  loop
    if exists (
      select 1 from profile_fields
      where field_key = k and student_editable
    ) then
      merged := jsonb_set(merged, array[k], new.profile -> k, true);
    end if;
  end loop;

  new.profile := merged;
  return new;
end;
$$;

drop trigger if exists students_profile_guard on students;
create trigger students_profile_guard
  before update on students
  for each row execute function guard_profile_jsonb();


-- =====================================================================
-- 7. VERIFY -- run each of these on its own
-- =====================================================================

-- select tablename, rowsecurity as rls_on
-- from pg_tables where schemaname='public' order by tablename;

-- select t.tablename, count(p.policyname) as policies
-- from pg_tables t
-- left join pg_policies p on p.schemaname=t.schemaname and p.tablename=t.tablename
-- where t.schemaname='public' group by t.tablename order by policies asc;

-- select field_key, label, section, student_visible, student_editable
-- from profile_fields order by section, display_order;
