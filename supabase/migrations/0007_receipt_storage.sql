-- 0007_receipt_storage.sql
-- Private receipts bucket + RLS storage policies. Path scheme:
--   {event_id}/{transaction_id}/{filename}
-- so the first path segment identifies the event; access is gated by
-- the existing public.is_event_member() helper.

-- Create the bucket if it doesn't already exist.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Members of the event can read their own event's receipts.
drop policy if exists "receipts_select_for_members" on storage.objects;
create policy "receipts_select_for_members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and split_part(name, '/', 1)
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);

-- Members can upload receipts under their event's prefix.
drop policy if exists "receipts_insert_for_members" on storage.objects;
create policy "receipts_insert_for_members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and split_part(name, '/', 1)
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);

-- Members can delete receipts within their event's prefix.
drop policy if exists "receipts_delete_for_members" on storage.objects;
create policy "receipts_delete_for_members"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and split_part(name, '/', 1)
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and public.is_event_member((split_part(name, '/', 1))::uuid)
);
