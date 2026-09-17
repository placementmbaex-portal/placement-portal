-- =====================================================================
-- Placement Portal -- R4 schema (WhatsApp share helper)
--
-- Safe to run repeatedly. Requires schema.sql, schema_r2.sql, schema_r3.sql.
-- Paste into the Supabase SQL Editor and Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tracking columns.
--
-- opened_at is stamped once, the moment a job first transitions to
-- is_open = true (see src/app/admin/jobs/actions.ts) -- it's how the
-- daily digest on /admin finds "jobs opened today" regardless of whether
-- the job was brand new or an existing draft toggled open. Re-closing and
-- re-opening a job does not reset it back to null.
--
-- whatsapp_shared_at is stamped whenever an admin copies or opens the
-- WhatsApp share message for that record -- never cleared automatically,
-- so it answers "has this ever been shared" rather than "was it shared
-- for the most recent change."
-- ---------------------------------------------------------------------
alter table jobs add column if not exists opened_at timestamptz;
alter table jobs add column if not exists whatsapp_shared_at timestamptz;
alter table announcements add column if not exists whatsapp_shared_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. WhatsApp message templates. Editable at /admin/settings.
--
-- Placeholders: {company} {title} {location} {deadline} {link} {excerpt}
-- {applied_count} {total_students} -- see src/lib/whatsapp.ts for exactly
-- how each one is substituted (and how a line disappears cleanly when its
-- only placeholder has nothing to show, e.g. {location} on a role with
-- none set).
-- ---------------------------------------------------------------------
insert into app_settings (key, value) values
  ('whatsapp_template_job',
   '"New role open: {company} — {title}\n{location}\nApply by {deadline}\n\n{link}"'::jsonb),
  ('whatsapp_template_announcement',
   '"{title}\n\n{excerpt}\n\n{link}"'::jsonb),
  ('whatsapp_template_reminder',
   '"{company} — {title} (closes {deadline})\n{link}"'::jsonb)
on conflict (key) do nothing;

-- No RLS changes needed: jobs/announcements already have admin-only
-- update policies (jobs_admin, announcements_update) that cover the two
-- new columns, and app_settings already restricts all access to admins
-- (app_settings_admin, schema_r3.sql).
