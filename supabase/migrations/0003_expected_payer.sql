-- 0003_expected_payer.sql
-- Adds an optional expected_payer_id to scheduled_payments so users can
-- mark up-front who is expected to make each upcoming payment. Used to
-- prefill the payer when marking a payment paid, and to display alongside
-- upcoming items.

alter table public.scheduled_payments
  add column expected_payer_id uuid references public.people(id) on delete set null;

create index scheduled_payments_expected_payer_idx
  on public.scheduled_payments(expected_payer_id)
  where deleted_at is null;
