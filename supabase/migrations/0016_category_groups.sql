-- 0016_category_groups.sql
-- Real-user feedback: a wedding has many categories (Light, Food, Decoration,
-- Jewellery, Catering, ...) and naturally clusters under sub-events (Reception,
-- Barat, Haldi, ...). Add a category_groups table + categories.group_id FK so
-- the UI can render grouped sections, group-level rollups, and templates can
-- seed both layers.
--
-- Strict model: every category belongs to exactly one group. Existing events
-- get a "General" group auto-created, all their categories assigned to it.

-- =========================================================================
-- CATEGORY_GROUPS
-- =========================================================================

create table public.category_groups (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  sort_order  int not null default 0,
  color       text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id)
);

create index category_groups_event_idx on public.category_groups(event_id) where deleted_at is null;

create trigger trg_category_groups_audit
before insert or update on public.category_groups
for each row execute function public.set_audit_fields();

alter table public.category_groups enable row level security;

create policy "category_groups_select_for_members" on public.category_groups
  for select to authenticated
  using (is_event_member(event_id) and deleted_at is null);

create policy "category_groups_insert_for_members" on public.category_groups
  for insert to authenticated
  with check (is_event_member(event_id));

create policy "category_groups_update_for_members" on public.category_groups
  for update to authenticated
  using (is_event_member(event_id))
  with check (is_event_member(event_id));

create policy "category_groups_delete_for_members" on public.category_groups
  for delete to authenticated
  using (is_event_member(event_id));

-- =========================================================================
-- CATEGORIES: add group_id (nullable first, backfill, then NOT NULL)
-- =========================================================================

alter table public.categories
  add column group_id uuid references public.category_groups(id) on delete restrict;

create index categories_group_idx on public.categories(group_id) where deleted_at is null;

-- Backfill: for every event that has ANY category (including soft-deleted),
-- create a "General" group and assign all that event's categories to it.
-- We must cover soft-deleted rows too so the NOT NULL constraint below holds
-- for the whole table. Idempotent via the group_id is null filter.
do $$
declare
  ev record;
  gid uuid;
begin
  for ev in
    select distinct event_id
    from public.categories
    where group_id is null
  loop
    insert into public.category_groups (event_id, name, sort_order)
    values (ev.event_id, 'General', 0)
    returning id into gid;

    update public.categories
    set group_id = gid
    where event_id = ev.event_id
      and group_id is null;
  end loop;
end $$;

-- Lock it in: every category must belong to a group.
alter table public.categories
  alter column group_id set not null;

-- =========================================================================
-- Recreate category_totals so callers (CategoriesList, EventSummary, etc.)
-- can read group_id without joining the base table.
-- event_totals depends on category_totals, so drop it first and recreate
-- with the same definition as 0011 — just rebuilt on top of the new view.
-- =========================================================================

drop view if exists public.event_totals;
drop view if exists public.category_totals;

create or replace view public.category_totals
with (security_invoker = on) as
select
  c.id,
  c.event_id,
  c.group_id,
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
