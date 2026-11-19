-- Bright Ideas: tables, photo bucket and review views for the upload sync.
-- Paste the whole file into Supabase → SQL Editor → New query, and Run.
-- Safe to run again: it only creates what is missing and replaces the view.
--
-- Only the sync endpoint (api/sync.ts) writes here, with the secret key,
-- which bypasses row level security. RLS is on with no policies, so the
-- publishable/anon key can read or write nothing.

create table if not exists public.devices (
  device_id   uuid primary key,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz,
  app_version text,
  origin      text          -- vercel, github-pages or local
);

create table if not exists public.learners (
  device_id  uuid not null,
  local_id   int  not null,
  name       text not null,  -- blanked when deleted
  plant      text not null default '',
  start_date date,
  updated_at timestamptz,
  deleted_at timestamptz,
  primary key (device_id, local_id)
);

create table if not exists public.entries (
  device_id        uuid not null,
  local_id         int  not null,
  learner_local_id int,           -- null for entries saved before names existed
  plant_id         int  not null,
  date             date not null,
  height           numeric not null,
  height_unit      text not null check (height_unit in ('cm', 'in')),
  height_cm        numeric not null,
  note             text not null default '',  -- blanked when deleted
  soil_checked     boolean,
  watered          boolean,
  photo_path       text,          -- {device_id}/{local_id}.jpg in the log-photos bucket
  created_at       timestamptz not null,
  updated_at       timestamptz,
  deleted_at       timestamptz,
  primary key (device_id, local_id)
);

create index if not exists entries_created_at_idx on public.entries (created_at desc);

alter table public.devices  enable row level security;
alter table public.learners enable row level security;
alter table public.entries  enable row level security;

-- Belt and braces: the public API roles get no table rights at all.
revoke all on public.devices, public.learners, public.entries from anon, authenticated;

-- Private bucket for photos: JPEG only, 2 MB max. No storage policies, so
-- only the secret key can read or write. Open photos from the dashboard
-- (Storage → log-photos) or with a signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('log-photos', 'log-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- For reviewing in the Table Editor: one row per entry with the learner's
-- name and plant and the device's site. security_invoker makes the view use
-- the caller's rights, so it cannot get around RLS.
create or replace view public.entries_readable with (security_invoker = true) as
select
  e.created_at,
  e.date,
  l.name        as learner_name,
  l.plant,
  e.height,
  e.height_unit,
  e.height_cm,
  e.soil_checked,
  e.watered,
  e.note,
  e.photo_path,
  e.updated_at,
  e.deleted_at,
  d.origin,
  d.app_version,
  e.device_id,
  e.local_id,
  e.learner_local_id
from public.entries e
left join public.learners l on l.device_id = e.device_id and l.local_id = e.learner_local_id
left join public.devices d on d.device_id = e.device_id
order by e.created_at desc;

revoke all on public.entries_readable from anon, authenticated;

-- ---------- Sun Day runs ----------
-- Added later as supabase/migrations/2026-11-sun-day-runs.sql; repeated here
-- so a fresh setup is complete.

-- One row per Sun Day run: the design, the prediction and the scores.
-- No free text: every value is a choice from the app (see src/sim/model.json).
create table if not exists public.sun_day_runs (
  device_id        uuid not null,
  local_id         int  not null,
  learner_local_id int  not null,
  crop             text not null,
  weather          text not null,
  days             int  not null check (days in (1, 7)),
  panels           text not null,  -- crop, weather, panels and challenge: keys in model.json
  height           text not null check (height in ('low', 'high')),
  fan              boolean not null,
  pump             boolean not null,
  challenge        text,          -- null for free play
  guess            text check (guess in ('more', 'same', 'less')),   -- null when skipped
  why              text check (why in ('shade', 'light', 'fan', 'pump')),
  actual           text not null check (actual in ('more', 'same', 'less')),
  score            int  not null check (score between 0 and 200),
  full_sun         int  not null check (full_sun between 0 and 100),
  food             int  not null check (food between 0 and 100),
  energy           int  not null check (energy between 0 and 100),
  created_at       timestamptz not null,
  updated_at       timestamptz,
  deleted_at       timestamptz,
  primary key (device_id, local_id)
);

create index if not exists sun_day_runs_created_at_idx on public.sun_day_runs (created_at desc);

alter table public.sun_day_runs enable row level security;
revoke all on public.sun_day_runs from anon, authenticated;

-- For reviewing in the Table Editor: one row per run with the learner's name.
create or replace view public.sun_day_runs_readable with (security_invoker = true) as
select
  r.created_at,
  l.name        as learner_name,
  r.crop,
  r.weather,
  r.days,
  r.panels,
  r.height,
  r.fan,
  r.pump,
  r.challenge,
  r.guess,
  r.why,
  r.actual,
  r.score,
  r.full_sun,
  r.food,
  r.energy,
  r.updated_at,
  r.deleted_at,
  d.origin,
  d.app_version,
  r.device_id,
  r.local_id,
  r.learner_local_id
from public.sun_day_runs r
left join public.learners l on l.device_id = r.device_id and l.local_id = r.learner_local_id
left join public.devices d on d.device_id = r.device_id
order by r.created_at desc;

revoke all on public.sun_day_runs_readable from anon, authenticated;
