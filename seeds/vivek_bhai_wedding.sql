-- Seed: "Vivek Bhai Wedding" event for kunal.kunalvicky@gmail.com
-- Source: Raw_notes.txt
-- Run in Supabase SQL Editor as superuser. Safe to re-run only after
-- deleting the previously-seeded event (it does NOT check for dupes).

do $$
declare
  v_user_id      uuid;
  v_event_id     uuid;
  v_kunal        uuid;
  v_vivek        uuid;
  v_cat          uuid;
  v_order        int := 0;
begin
  -- 1) Resolve the user
  select id into v_user_id from auth.users where email = 'kunal.kunalvicky@gmail.com';
  if v_user_id is null then
    raise exception 'User kunal.kunalvicky@gmail.com not found in auth.users';
  end if;

  -- 2) Create the event (trg_event_add_owner auto-adds the owner to event_members)
  insert into public.events (name, owner_id, event_date)
  values ('Vivek Bhai Wedding', v_user_id, null)
  returning id into v_event_id;

  -- 3) People (per-event payer list, separate from app-user members)
  insert into public.people (event_id, name) values (v_event_id, 'Kunal') returning id into v_kunal;
  insert into public.people (event_id, name) values (v_event_id, 'Vivek') returning id into v_vivek;

  -- 4) Categories with actual data (already-done + scheduled)

  -- Bharat 1 — total 17,000 paid (no specific payer/date in notes; using Vivek + May 15)
  insert into public.categories (event_id, name, confirmed_amount, sort_order)
  values (v_event_id, 'Bharat 1', 17000, v_order)
  returning id into v_cat;
  v_order := v_order + 1;
  insert into public.transactions (event_id, category_id, person_id, amount, txn_date, note)
  values (v_event_id, v_cat, v_vivek, 17000, '2026-05-15', 'Total paid');

  -- Bharat 2 — total 73,000; 33k advance 21 May (Vivek); 25k due 15 Nov; 15k due 26 Nov
  insert into public.categories (event_id, name, confirmed_amount, sort_order)
  values (v_event_id, 'Bharat 2', 73000, v_order)
  returning id into v_cat;
  v_order := v_order + 1;
  insert into public.transactions (event_id, category_id, person_id, amount, txn_date, note)
  values (v_event_id, v_cat, v_vivek, 33000, '2026-05-21', 'Advance');
  insert into public.scheduled_payments (event_id, category_id, due_date, expected_amount, expected_payer_id)
  values (v_event_id, v_cat, '2026-11-15', 25000, v_vivek);
  insert into public.scheduled_payments (event_id, category_id, due_date, expected_amount, expected_payer_id)
  values (v_event_id, v_cat, '2026-11-26', 15000, v_vivek);

  -- Clothes (Court / Engagement) — 13,000 paid 26 May (Vivek)
  insert into public.categories (event_id, name, confirmed_amount, note, sort_order)
  values (v_event_id, 'Clothes (Court / Engagement)', 13000, 'Jodhpuri ₹8500 + Saree ₹4500', v_order)
  returning id into v_cat;
  v_order := v_order + 1;
  insert into public.transactions (event_id, category_id, person_id, amount, txn_date, note)
  values (v_event_id, v_cat, v_vivek, 13000, '2026-05-26', 'Jodhpuri + Saree');

  -- Makeup Bahus — 17,000 confirmed; 4,000 advance (no date in notes; using 21 May)
  insert into public.categories (event_id, name, confirmed_amount, sort_order)
  values (v_event_id, 'Makeup Bahus', 17000, v_order)
  returning id into v_cat;
  v_order := v_order + 1;
  insert into public.transactions (event_id, category_id, person_id, amount, txn_date, note)
  values (v_event_id, v_cat, v_vivek, 4000, '2026-05-21', 'Advance');

  -- 5) Planned-only categories (Expenditure Expected)

  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Reception - Decoration',      180000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Reception - Pandal',           80000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Reception - Light',            60000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, note, sort_order) values
    (v_event_id, 'Reception - Food / Catering', 480000, '800 × 600', v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, note, sort_order) values
    (v_event_id, 'Reception - DJ',               'Quote pending', v_order); v_order := v_order + 1;

  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Food Daily',                   40000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, note, sort_order) values
    (v_event_id, 'Jewellery',                   600000, 'Plus mummy''s jewellery', v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Photographer',                100000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Hotel',                        50000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Wedding Card',                  8000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Clothes - Sarees',            100000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Crackers / Fireworks',         60000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Gurujat Sangh',                10000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Clothes - Family',             80000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Sherwani',                     25000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Suit',                         20000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Car - JSR',                    15000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Car - CG',                     15000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Makeup Family',                30000, v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, note, sort_order) values
    (v_event_id, 'Train Ticket A',               70000, '35 × 1000 × 2', v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, note, sort_order) values
    (v_event_id, 'Train Ticket B',               32000, '10 × 1600 × 2', v_order); v_order := v_order + 1;
  insert into public.categories (event_id, name, planned_amount, sort_order) values
    (v_event_id, 'Batli',                        30000, v_order); v_order := v_order + 1;

  raise notice 'Seeded event % with 26 categories', v_event_id;
end $$;
