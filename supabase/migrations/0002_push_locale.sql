-- Language for push alerts: 'fr', 'en' or 'es'. French is the default (Quebec).
alter table public.push_tokens add column if not exists locale text not null default 'fr'
  check (locale in ('fr', 'en', 'es'));
