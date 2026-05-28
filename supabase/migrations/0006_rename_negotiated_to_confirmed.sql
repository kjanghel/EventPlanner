-- 0006_rename_negotiated_to_confirmed.sql
-- Rename "negotiated" -> "confirmed" so the budget vocabulary is clearer:
--   Planned (initial guess) -> Confirmed (vendor-agreed price) -> Paid.
-- Touches categories.negotiated_amount and the two totals views.

drop view if exists public.event_totals;
drop view if exists public.category_totals;

alter table public.categories
  rename column negotiated_amount to confirmed_amount;

create or replace view public.category_totals
with (security_invoker = on) as
select
  c.id,
  c.event_id,
  c.name,
  c.planned_amount,
  c.confirmed_amount,
  c.note,
  c.sort_order,
  coalesce((
    select sum(t.amount) from public.transactions t
    where t.category_id = c.id and t.deleted_at is null
  ), 0)::numeric(14,2) as paid_total,
  coalesce((
    select sum(sp.expected_amount) from public.scheduled_payments sp
    where sp.category_id = c.id
      and sp.status = 'pending'
      and sp.deleted_at is null
  ), 0)::numeric(14,2) as scheduled_total
from public.categories c
where c.deleted_at is null;

create or replace view public.event_totals
with (security_invoker = on) as
select
  e.id as event_id,
  e.name,
  e.event_date,
  e.currency,
  coalesce(sum(ct.planned_amount), 0)::numeric(14,2)   as planned_total,
  coalesce(sum(ct.confirmed_amount), 0)::numeric(14,2) as confirmed_total,
  coalesce(sum(ct.paid_total), 0)::numeric(14,2)       as paid_total,
  coalesce(sum(ct.scheduled_total), 0)::numeric(14,2)  as scheduled_total
from public.events e
left join public.category_totals ct on ct.event_id = e.id
where e.deleted_at is null
group by e.id, e.name, e.event_date, e.currency;
