-- Hard-deletes everything one device uploaded: its devices, learners and
-- entries rows. Use it to remove test data. It cannot be undone.
--
-- Photos: Supabase blocks deleting Storage files from SQL (and a forced SQL
-- delete would orphan the files), so delete them in the dashboard first:
--   Storage → log-photos → tick the folder named after the device id → Delete.
-- This script then reports how many photo files are left (should be 0).
--
-- 1. Put the device id below. Find it in Table Editor → devices, or in the
--    test browser: DevTools → Application → Local Storage → bright-ideas:deviceId.
-- 2. Paste the file into SQL Editor → New query, and Run.

with target as (
  select '00000000-0000-0000-0000-000000000000'::uuid as device_id  -- ← the device id
),
del_entries as (
  delete from public.entries e using target t where e.device_id = t.device_id returning 1
),
del_learners as (
  delete from public.learners l using target t where l.device_id = t.device_id returning 1
),
del_devices as (
  delete from public.devices d using target t where d.device_id = t.device_id returning 1
)
select
  (select device_id from target)  as device_id,
  (select count(*) from del_devices)  as devices_deleted,
  (select count(*) from del_learners) as learners_deleted,
  (select count(*) from del_entries)  as entries_deleted,
  (select count(*) from storage.objects o, target t
    where o.bucket_id = 'log-photos' and o.name like t.device_id::text || '/%') as photos_still_in_storage;
