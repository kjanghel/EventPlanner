-- 0010_fk_cleanup_rules.sql
-- Tighten the foreign-key behaviour so the DB enforces what makes sense:
--   * deleting a category should sweep its transactions / scheduled rows
--     (was RESTRICT — caused random orphaned ON DELETE failures);
--   * deleting a person should be blocked if there's any transaction or
--     scheduled payment pointing at them (was SET NULL — quietly left
--     ledger rows with a missing payer, which is dangerous for an
--     "every transaction has a payer" invariant).

-- 1) Categories cascade to children
alter table public.transactions drop constraint if exists transactions_category_id_fkey;
alter table public.transactions add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete cascade;

alter table public.scheduled_payments drop constraint if exists scheduled_payments_category_id_fkey;
alter table public.scheduled_payments add constraint scheduled_payments_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete cascade;

-- 2) People deletes are blocked when they have transactions or scheduled rows
alter table public.transactions drop constraint if exists transactions_person_id_fkey;
alter table public.transactions add constraint transactions_person_id_fkey
  foreign key (person_id) references public.people(id) on delete restrict;

alter table public.scheduled_payments drop constraint if exists scheduled_payments_expected_payer_id_fkey;
alter table public.scheduled_payments add constraint scheduled_payments_expected_payer_id_fkey
  foreign key (expected_payer_id) references public.people(id) on delete restrict;
