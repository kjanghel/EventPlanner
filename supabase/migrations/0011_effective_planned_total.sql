-- 0011_effective_planned_total.sql
-- Make the event-level Planned rollup use the *effective* planned for each
-- category: if planned_amount is null/0, fall back to confirmed_amount.
-- This stops categories that were never planned (but have a confirmed
-- quote) from making the event look perpetually over budget.
--
-- Only the view's aggregation changes. categories.planned_amount stays
-- as-is, so individual category rows still display 0 when nothing was
-- planned (CategoriesList, CategoryDetail, etc.).

create or replace view public.event_totals
with (security_invoker = on) as
select
  e.id as event_id,
  e.name,
  e.event_date,
  e.currency,
  coalesce(sum(
    case
      when ct.planned_amount is not null and ct.planned_amount > 0
        then ct.planned_amount
      else coalesce(ct.confirmed_amount, 0)
    end
  ), 0)::numeric(14,2) as planned_total,
  coalesce(sum(ct.confirmed_amount), 0)::numeric(14,2) as confirmed_total,
  coalesce(sum(ct.paid_total), 0)::numeric(14,2)       as paid_total,
  coalesce(sum(ct.scheduled_total), 0)::numeric(14,2)  as scheduled_total
from public.events e
left join public.category_totals ct on ct.event_id = e.id
where e.deleted_at is null
group by e.id, e.name, e.event_date, e.currency;
