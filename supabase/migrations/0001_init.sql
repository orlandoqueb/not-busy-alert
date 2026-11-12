-- Not Busy Alert: initial schema
-- Places are shared across users so each place is checked once per cycle,
-- no matter how many people follow it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- One row per Google place anyone has favorited.
create table public.places (
  google_place_id text primary key,          -- e.g. ChIJD3uTd9hx5kcR1IQvGfr8dbk
  name            text not null,
  address         text,
  lat             double precision,
  lng             double precision,
  timezone        text,                       -- IANA, e.g. Europe/Paris
  -- Latest reading from the busyness provider
  live_busyness   smallint,                   -- 0-100, null if no live data
  live_label      text,                       -- e.g. "Not too busy"
  usual_by_day    jsonb,                      -- {"monday":[{hour:6,score:12},...],...}
  checked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- History of live readings (for charts and debugging).
create table public.busyness_readings (
  id              bigint generated always as identity primary key,
  google_place_id text not null references public.places on delete cascade,
  busyness        smallint,
  label           text,
  read_at         timestamptz not null default now()
);
create index on public.busyness_readings (google_place_id, read_at desc);

-- A user's favorite place plus their alert settings for it.
create table public.favorites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  google_place_id text not null references public.places on delete cascade,
  alerts_enabled  boolean not null default true,
  threshold       smallint not null default 40 check (threshold between 0 and 100),
  days            smallint[] not null default '{0,1,2,3,4,5,6}', -- 0 = Sunday
  start_minute    smallint not null default 0,     -- minutes after local midnight
  end_minute      smallint not null default 1440,
  cooldown_min    smallint not null default 120,   -- don't re-alert within this window
  last_alert_at   timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, google_place_id)
);

-- Expo push tokens, one user may have several devices.
create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);

-- Row level security: users only see and edit their own rows.
alter table public.places enable row level security;
alter table public.busyness_readings enable row level security;
alter table public.favorites enable row level security;
alter table public.push_tokens enable row level security;

create policy "places readable by signed-in users" on public.places
  for select to authenticated using (true);
create policy "signed-in users can add places" on public.places
  for insert to authenticated with check (true);

create policy "readings readable by signed-in users" on public.busyness_readings
  for select to authenticated using (true);

create policy "own favorites" on public.favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own push tokens" on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Run the checker every 10 minutes. Replace the two placeholders after deploying
-- (Project URL and service role key are under Project Settings > API).
-- select cron.schedule(
--   'check-busyness',
--   '*/10 * * * *',
--   $$ select net.http_post(
--        url     := 'https://YOUR-PROJECT.supabase.co/functions/v1/check-busyness',
--        headers := jsonb_build_object('Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY')
--      ); $$
-- );
