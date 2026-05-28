-- 0009_hard_delete_policies.sql
-- Switch from soft-delete UPDATE (which was tripping WITH CHECK on the
-- update policies) to actual DELETE. Adds DELETE policies for the four
-- tables that didn't have them, restores a sane events update policy
-- (replacing the using(true) test policy from earlier), and keeps the
-- existing soft-delete update path working for the members table.

-- 1) Revert the permissive events_update_test policy and restore the
--    owner-fallback update policy.
drop policy if exists "events_update_test" on public.events;
drop policy if exists "events_update_for_members" on public.events;
drop policy if exists "events_update_for_owner_or_members" on public.events;
create policy "events_update_for_owner_or_members"
on public.events for update to authenticated
using (owner_id = auth.uid() or is_event_member(id))
with check (owner_id = auth.uid() or is_event_member(id));

-- 2) DELETE policies for the soft-delete-replaced tables. FK cascades from
--    events (already in the schema) clean up dependants when an event is
--    deleted; transactions/scheduled cascade from categories.

drop policy if exists "transactions_delete_for_members" on public.transactions;
create policy "transactions_delete_for_members"
on public.transactions for delete to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "categories_delete_for_members" on public.categories;
create policy "categories_delete_for_members"
on public.categories for delete to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "scheduled_payments_delete_for_members" on public.scheduled_payments;
create policy "scheduled_payments_delete_for_members"
on public.scheduled_payments for delete to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "people_delete_for_members" on public.people;
create policy "people_delete_for_members"
on public.people for delete to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);
