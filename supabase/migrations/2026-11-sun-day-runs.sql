-- Sun Day runs (feature/sun-day). Additive only: creates a new table and a
-- new view, and changes nothing that already exists. Safe to run again.
-- Run it in Supabase → SQL Editor → New query BEFORE the app version that
-- uploads Sun Day runs is deployed; until then those uploads fail and wait.
-- The same statements are at the end of schema.sql, for a fresh setup.

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
