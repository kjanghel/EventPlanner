-- Per-user UI language preference. 'en' = English (default), 'hi' = Hindi.
-- Only affects UI strings; user-entered data (names, notes, category labels)
-- is stored verbatim and not translated.

alter table public.profiles
  add column if not exists locale text not null default 'en'
    check (locale in ('en', 'hi'));
