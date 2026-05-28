-- 0002_features.sql
-- Full feature schema: events, members, invites, people, categories,
-- transactions, scheduled payments. Plus RLS, audit triggers, helper
-- functions, views, and invite-on-signup linking.
--
-- Phase 1 uses events / event_members only. Later phases populate the rest.

-- =========================================================================
-- Audit fields helper (created_at / updated_at / created_by / updated_by)
-- =========================================================================

create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- =========================================================================
-- EVENTS
-- =========================================================================

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  event_date  date,
  currency    text not null default 'INR',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id)
);

create index events_owner_idx on public.events(owner_id) where deleted_at is null;

create trigger trg_events_audit
before insert or update on public.events
for each row execute function public.set_audit_fields();

alter table public.events enable row level security;

-- =========================================================================
-- EVENT_MEMBERS
-- =========================================================================

create table public.event_members (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  deleted_at timestamptz,
  added_at   timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_members_user_idx on public.event_members(user_id) where deleted_at is null;

alter table public.event_members enable row level security;

-- =========================================================================
-- Membership helper functions (security definer so RLS policies can use
-- them without triggering recursive policy checks on event_members)
-- =========================================================================

create or replace function public.is_event_member(eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = eid
      and user_id = auth.uid()
      and deleted_at is null
  );
$$;

create or replace function public.is_event_owner(eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = eid
      and user_id = auth.uid()
      and role = 'owner'
      and deleted_at is null
  );
$$;

-- Auto-add the owner as a member when an event is created.
create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (event_id, user_id) do nothing;
  return new;
end;
$$;

create trigger trg_event_add_owner
after insert on public.events
for each row execute function public.add_owner_as_member();

-- =========================================================================
-- EVENT_INVITES — owner sends an invite by phone; signup trigger links it.
-- =========================================================================

create table public.event_invites (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  invited_phone  text not null,
  invited_by     uuid references auth.users(id),
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'cancelled')),
  deleted_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index event_invites_phone_idx
  on public.event_invites(invited_phone)
  where status = 'pending' and deleted_at is null;

alter table public.event_invites enable row level security;

-- =========================================================================
-- PEOPLE — per-event payer list (e.g. Vivek, Papa). Not tied to app users.
-- =========================================================================

create table public.people (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  phone_e164  text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id)
);

create index people_event_idx on public.people(event_id) where deleted_at is null;

create trigger trg_people_audit
before insert or update on public.people
for each row execute function public.set_audit_fields();

alter table public.people enable row level security;

-- =========================================================================
-- CATEGORIES — buckets like "Bhaat 2", "Catering", "Jewellery".
-- Each holds planned_amount (early guess) and negotiated_amount (vendor
-- contract). Real money flows in via transactions + scheduled_payments.
-- =========================================================================

create table public.categories (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  planned_amount     numeric(14, 2),
  negotiated_amount  numeric(14, 2),
  note               text,
  sort_order         int not null default 0,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id),
  updated_by         uuid references auth.users(id)
);

create index categories_event_idx on public.categories(event_id) where deleted_at is null;

create trigger trg_categories_audit
before insert or update on public.categories
for each row execute function public.set_audit_fields();

alter table public.categories enable row level security;

-- =========================================================================
-- TRANSACTIONS — real money paid. paid_by = person_id from event's People list.
-- =========================================================================

create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  category_id       uuid not null references public.categories(id) on delete restrict,
  person_id         uuid references public.people(id) on delete set null,
  amount            numeric(14, 2) not null check (amount >= 0),
  txn_date          date not null default current_date,
  note              text,
  receipt_path      text,
  from_scheduled_id uuid,   -- set when created via mark-as-paid (Phase 3)
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id),
  updated_by        uuid references auth.users(id)
);

create index transactions_category_idx on public.transactions(category_id) where deleted_at is null;
create index transactions_event_idx on public.transactions(event_id) where deleted_at is null;

create trigger trg_transactions_audit
before insert or update on public.transactions
for each row execute function public.set_audit_fields();

alter table public.transactions enable row level security;

-- =========================================================================
-- SCHEDULED_PAYMENTS — future expected payments. Mark-as-paid creates a
-- transactions row and links via paid_transaction_id.
-- =========================================================================

create table public.scheduled_payments (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references public.events(id) on delete cascade,
  category_id          uuid not null references public.categories(id) on delete restrict,
  due_date             date not null,
  expected_amount      numeric(14, 2) not null check (expected_amount >= 0),
  status               text not null default 'pending'
                       check (status in ('pending', 'paid', 'cancelled')),
  paid_transaction_id  uuid references public.transactions(id) on delete set null,
  note                 text,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id),
  updated_by           uuid references auth.users(id)
);

create index scheduled_payments_category_idx on public.scheduled_payments(category_id) where deleted_at is null;
create index scheduled_payments_due_idx on public.scheduled_payments(due_date) where status = 'pending' and deleted_at is null;

create trigger trg_scheduled_payments_audit
before insert or update on public.scheduled_payments
for each row execute function public.set_audit_fields();

alter table public.scheduled_payments enable row level security;

-- Back-reference from transactions.from_scheduled_id (added after both
-- tables exist to avoid a circular dependency in DDL).
alter table public.transactions
  add constraint transactions_from_scheduled_fk
  foreign key (from_scheduled_id) references public.scheduled_payments(id) on delete set null;

-- =========================================================================
-- RLS POLICIES
-- =========================================================================

-- events
create policy "events_select_for_members" on public.events
  for select to authenticated
  using ((is_event_member(id) or owner_id = auth.uid()) and deleted_at is null);

create policy "events_insert_self_owner" on public.events
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "events_update_for_members" on public.events
  for update to authenticated
  using (is_event_member(id))
  with check (is_event_member(id));

create policy "events_delete_for_owner" on public.events
  for delete to authenticated
  using (is_event_owner(id));

-- event_members
create policy "event_members_select_for_members" on public.event_members
  for select to authenticated
  using (is_event_member(event_id));

create policy "event_members_insert_for_owner" on public.event_members
  for insert to authenticated
  with check (is_event_owner(event_id));

create policy "event_members_delete_for_owner_or_self" on public.event_members
  for delete to authenticated
  using (is_event_owner(event_id) or user_id = auth.uid());

-- event_invites
create policy "event_invites_select_for_members" on public.event_invites
  for select to authenticated
  using (is_event_member(event_id));

create policy "event_invites_insert_for_owner" on public.event_invites
  for insert to authenticated
  with check (is_event_owner(event_id));

create policy "event_invites_update_for_owner" on public.event_invites
  for update to authenticated
  using (is_event_owner(event_id))
  with check (is_event_owner(event_id));

-- people
create policy "people_select_for_members" on public.people
  for select to authenticated
  using (is_event_member(event_id) and deleted_at is null);

create policy "people_insert_for_members" on public.people
  for insert to authenticated
  with check (is_event_member(event_id));

create policy "people_update_for_members" on public.people
  for update to authenticated
  using (is_event_member(event_id))
  with check (is_event_member(event_id));

-- categories
create policy "categories_select_for_members" on public.categories
  for select to authenticated
  using (is_event_member(event_id) and deleted_at is null);

create policy "categories_insert_for_members" on public.categories
  for insert to authenticated
  with check (is_event_member(event_id));

create policy "categories_update_for_members" on public.categories
  for update to authenticated
  using (is_event_member(event_id))
  with check (is_event_member(event_id));

-- transactions
create policy "transactions_select_for_members" on public.transactions
  for select to authenticated
  using (is_event_member(event_id) and deleted_at is null);

create policy "transactions_insert_for_members" on public.transactions
  for insert to authenticated
  with check (is_event_member(event_id));

create policy "transactions_update_for_members" on public.transactions
  for update to authenticated
  using (is_event_member(event_id))
  with check (is_event_member(event_id));

-- scheduled_payments
create policy "scheduled_payments_select_for_members" on public.scheduled_payments
  for select to authenticated
  using (is_event_member(event_id) and deleted_at is null);

create policy "scheduled_payments_insert_for_members" on public.scheduled_payments
  for insert to authenticated
  with check (is_event_member(event_id));

create policy "scheduled_payments_update_for_members" on public.scheduled_payments
  for update to authenticated
  using (is_event_member(event_id))
  with check (is_event_member(event_id));

-- =========================================================================
-- VIEWS — aggregate reads for UI. security_invoker=on so RLS on underlying
-- tables still applies to the calling user.
-- =========================================================================

create or replace view public.category_totals
with (security_invoker = on) as
select
  c.id,
  c.event_id,
  c.name,
  c.planned_amount,
  c.negotiated_amount,
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
  coalesce(sum(ct.planned_amount), 0)::numeric(14,2)    as planned_total,
  coalesce(sum(ct.negotiated_amount), 0)::numeric(14,2) as negotiated_total,
  coalesce(sum(ct.paid_total), 0)::numeric(14,2)        as paid_total,
  coalesce(sum(ct.scheduled_total), 0)::numeric(14,2)   as scheduled_total
from public.events e
left join public.category_totals ct on ct.event_id = e.id
where e.deleted_at is null
group by e.id, e.name, e.event_date, e.currency;

create or replace view public.person_totals
with (security_invoker = on) as
select
  p.id as person_id,
  p.event_id,
  p.name,
  p.phone_e164,
  coalesce((
    select sum(t.amount) from public.transactions t
    where t.person_id = p.id and t.deleted_at is null
  ), 0)::numeric(14,2) as paid_total
from public.people p
where p.deleted_at is null;

create or replace view public.my_upcoming_payments
with (security_invoker = on) as
select
  sp.id,
  sp.event_id,
  sp.category_id,
  c.name as category_name,
  e.name as event_name,
  sp.due_date,
  sp.expected_amount,
  sp.note
from public.scheduled_payments sp
join public.categories c on c.id = sp.category_id
join public.events e on e.id = sp.event_id
where sp.status = 'pending'
  and sp.deleted_at is null
  and sp.due_date <= current_date + interval '7 days'
order by sp.due_date asc;

-- =========================================================================
-- Extend handle_new_user to auto-link any matching event_invites once the
-- user has a phone number on their profile. The phone is set later by
-- PhoneCapture, so we wire this to fire on profile update instead.
-- =========================================================================

create or replace function public.link_invites_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone_e164 is not null
     and (old.phone_e164 is null or old.phone_e164 <> new.phone_e164) then
    insert into public.event_members (event_id, user_id, role)
    select inv.event_id, new.id, 'editor'
    from public.event_invites inv
    where inv.invited_phone = new.phone_e164
      and inv.status = 'pending'
      and inv.deleted_at is null
    on conflict (event_id, user_id) do nothing;

    update public.event_invites
    set status = 'accepted'
    where invited_phone = new.phone_e164
      and status = 'pending'
      and deleted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_link_invites on public.profiles;
create trigger trg_profile_link_invites
after update of phone_e164 on public.profiles
for each row execute function public.link_invites_for_profile();
