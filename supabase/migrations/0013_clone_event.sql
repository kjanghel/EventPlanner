-- 0013_clone_event.sql
-- SECURITY DEFINER RPC that atomically copies an event the caller can
-- access into a brand-new event owned by the caller. Categories, people,
-- transactions, and scheduled payments are all copied with FK references
-- remapped via in-function jsonb maps. Things that don't carry over:
--   * receipts (point at the source event's storage path; copying the
--     blobs is a separate, opt-in concern)
--   * scheduled_payments.paid_transaction_id (status is reset to pending
--     so the copy starts with a clean ledger)
--   * transactions.from_scheduled_id (scheduled ids change anyway)

create or replace function public.clone_event(
  p_source_event_id uuid,
  p_new_name        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_new_event_id uuid;
  v_currency     text;
  v_person_map   jsonb := '{}'::jsonb;
  v_category_map jsonb := '{}'::jsonb;
  v_new_id       uuid;
  rec            record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Only allow cloning events the caller is the owner of or a member of.
  select e.currency into v_currency
  from public.events e
  where e.id = p_source_event_id
    and e.deleted_at is null
    and (
      e.owner_id = v_user_id
      or exists (
        select 1 from public.event_members em
        where em.event_id = e.id
          and em.user_id = v_user_id
          and em.deleted_at is null
      )
    );

  if v_currency is null then
    raise exception 'Source event not found or not accessible';
  end if;

  -- New event. trg_event_add_owner auto-inserts the owner into event_members.
  insert into public.events (name, owner_id, currency)
  values (coalesce(nullif(trim(p_new_name), ''), 'Untitled'), v_user_id, v_currency)
  returning id into v_new_event_id;

  -- People: copy, build old_id -> new_id map.
  for rec in
    select id, name, phone_e164 from public.people
    where event_id = p_source_event_id
  loop
    insert into public.people (event_id, name, phone_e164)
    values (v_new_event_id, rec.name, rec.phone_e164)
    returning id into v_new_id;
    v_person_map := v_person_map || jsonb_build_object(rec.id::text, v_new_id::text);
  end loop;

  -- Categories: same, preserve sort_order.
  for rec in
    select id, name, planned_amount, confirmed_amount, note, sort_order
    from public.categories
    where event_id = p_source_event_id
      and deleted_at is null
    order by sort_order
  loop
    insert into public.categories (
      event_id, name, planned_amount, confirmed_amount, note, sort_order
    )
    values (
      v_new_event_id, rec.name, rec.planned_amount, rec.confirmed_amount,
      rec.note, rec.sort_order
    )
    returning id into v_new_id;
    v_category_map := v_category_map || jsonb_build_object(rec.id::text, v_new_id::text);
  end loop;

  -- Transactions: remap category_id and person_id; receipt_path stays null
  -- (storage blobs are not copied); from_scheduled_id is reset.
  for rec in
    select category_id, person_id, amount, txn_date, note
    from public.transactions
    where event_id = p_source_event_id
      and deleted_at is null
  loop
    insert into public.transactions (
      event_id, category_id, person_id, amount, txn_date, note
    )
    values (
      v_new_event_id,
      (v_category_map ->> (rec.category_id::text))::uuid,
      case when rec.person_id is null then null
           else nullif(v_person_map ->> (rec.person_id::text), '')::uuid
      end,
      rec.amount,
      rec.txn_date,
      rec.note
    );
  end loop;

  -- Scheduled payments: remap category_id and expected_payer_id; status
  -- reset to pending so the copy starts with a clean ledger.
  for rec in
    select category_id, due_date, expected_amount, expected_payer_id, note
    from public.scheduled_payments
    where event_id = p_source_event_id
      and deleted_at is null
  loop
    insert into public.scheduled_payments (
      event_id, category_id, due_date, expected_amount, expected_payer_id, note
    )
    values (
      v_new_event_id,
      (v_category_map ->> (rec.category_id::text))::uuid,
      rec.due_date,
      rec.expected_amount,
      case when rec.expected_payer_id is null then null
           else nullif(v_person_map ->> (rec.expected_payer_id::text), '')::uuid
      end,
      rec.note
    );
  end loop;

  return v_new_event_id;
end;
$$;

grant execute on function public.clone_event(uuid, text) to authenticated;
