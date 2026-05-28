import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

// =====================================================================
// Types — kept in sync with supabase/migrations/0002_features.sql
// =====================================================================

export type Event = {
  id: string
  name: string
  owner_id: string
  event_date: string | null
  currency: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type EventTotals = {
  event_id: string
  name: string
  event_date: string | null
  currency: string
  planned_total: number
  confirmed_total: number
  paid_total: number
  scheduled_total: number
}

export type Person = {
  id: string
  event_id: string
  name: string
  phone_e164: string | null
}

export type Category = {
  id: string
  event_id: string
  name: string
  planned_amount: number | null
  confirmed_amount: number | null
  note: string | null
  sort_order: number
}

export type CategoryTotals = Category & {
  paid_total: number
  scheduled_total: number
}

export type Transaction = {
  id: string
  event_id: string
  category_id: string
  person_id: string | null
  amount: number
  txn_date: string
  note: string | null
  receipt_path: string | null
  from_scheduled_id: string | null
  created_at: string
}

export type ScheduledPayment = {
  id: string
  event_id: string
  category_id: string
  due_date: string
  expected_amount: number
  status: 'pending' | 'paid' | 'cancelled'
  paid_transaction_id: string | null
  expected_payer_id: string | null
  note: string | null
}

export type UpcomingPayment = {
  id: string
  event_id: string
  category_id: string
  category_name: string
  event_name: string
  due_date: string
  expected_amount: number
  expected_payer_id: string | null
  expected_payer_name: string | null
  note: string | null
}

export type PersonTotals = {
  person_id: string
  event_id: string
  name: string
  phone_e164: string | null
  paid_total: number
}

export type EventMember = {
  event_id: string
  user_id: string
  role: 'owner' | 'editor'
  display_name: string | null
  added_at: string
}

export type EventInvite = {
  id: string
  event_id: string
  invited_email: string
  status: 'pending' | 'accepted' | 'cancelled'
  created_at: string
}

// =====================================================================
// Events
// =====================================================================

export async function listMyEvents(session: Session | null): Promise<EventTotals[]> {
  console.log('[queries] listMyEvents called with session:', !!session)
  try {
    if (!session) {
      throw new Error('No session - user not authenticated')
    }

    console.log('[queries] Session OK, querying event_totals...')
    const startQuery = Date.now()

    const { data, error } = await supabase
      .from('event_totals')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })

    const queryTime = Date.now() - startQuery
    console.log('[queries] Query took', queryTime, 'ms:', {
      dataLength: Array.isArray(data) ? data.length : null,
      error: error?.message,
    })

    if (error) throw error
    return (data ?? []) as EventTotals[]
  } catch (err) {
    console.error('[queries] listMyEvents error:', err)
    throw err
  }
}

export async function getEvent(id: string): Promise<EventTotals | null> {
  const { data, error } = await supabase
    .from('event_totals')
    .select('*')
    .eq('event_id', id)
    .maybeSingle()
  if (error) throw error
  return (data as EventTotals | null) ?? null
}

export async function updateMyProfile(input: {
  display_name?: string | null
  phone_e164?: string | null
}): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not signed in')
  const updates: Record<string, unknown> = {}
  if (input.display_name !== undefined) {
    const trimmed = input.display_name?.trim()
    updates.display_name = trimmed ? trimmed : null
  }
  if (input.phone_e164 !== undefined) {
    const trimmed = input.phone_e164?.trim()
    updates.phone_e164 = trimmed ? trimmed : null
  }
  if (Object.keys(updates).length === 0) return
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.user.id)
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createEvent(input: {
  name: string
  event_date?: string | null
}): Promise<Event> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: input.name.trim(),
      event_date: input.event_date ?? null,
      owner_id: user.user.id,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Event
}

// =====================================================================
// People
// =====================================================================

export async function listPeople(eventId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('event_id', eventId)
    .order('name')
  if (error) throw error
  return (data ?? []) as Person[]
}

export async function createPerson(eventId: string, input: {
  name: string
  phone_e164?: string | null
}): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .insert({
      event_id: eventId,
      name: input.name.trim(),
      phone_e164: input.phone_e164 ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Person
}

export async function updatePerson(
  id: string,
  input: { name?: string; phone_e164?: string | null }
): Promise<Person> {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.phone_e164 !== undefined) updates.phone_e164 = input.phone_e164

  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Person
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// =====================================================================
// Categories
// =====================================================================

export async function listCategories(eventId: string): Promise<CategoryTotals[]> {
  const { data, error } = await supabase
    .from('category_totals')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as CategoryTotals[]
}

export async function getCategoryTotals(categoryId: string): Promise<CategoryTotals | null> {
  const { data, error } = await supabase
    .from('category_totals')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle()
  if (error) throw error
  return (data as CategoryTotals | null) ?? null
}

export async function createCategory(eventId: string, input: {
  name: string
  planned_amount?: number | null
  confirmed_amount?: number | null
  note?: string | null
}): Promise<Category> {
  const maxOrder = await supabase
    .from('categories')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('categories')
    .insert({
      event_id: eventId,
      name: input.name.trim(),
      planned_amount: input.planned_amount ?? null,
      confirmed_amount: input.confirmed_amount ?? null,
      note: input.note ?? null,
      sort_order: (maxOrder.data?.sort_order ?? -1) + 1,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Category
}

export async function updateCategory(
  id: string,
  input: {
    name?: string
    planned_amount?: number | null
    confirmed_amount?: number | null
    note?: string | null
  }
): Promise<Category> {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.planned_amount !== undefined) updates.planned_amount = input.planned_amount
  if (input.confirmed_amount !== undefined) updates.confirmed_amount = input.confirmed_amount
  if (input.note !== undefined) updates.note = input.note

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// =====================================================================
// Transactions
// =====================================================================

export async function listTransactions(categoryId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('category_id', categoryId)
    .order('txn_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transaction[]
}

export async function createTransaction(input: {
  event_id: string
  category_id: string
  person_id: string | null
  amount: number
  txn_date?: string
  note?: string
  from_scheduled_id?: string
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      event_id: input.event_id,
      category_id: input.category_id,
      person_id: input.person_id,
      amount: input.amount,
      txn_date: input.txn_date ?? new Date().toISOString().split('T')[0],
      note: input.note ?? null,
      from_scheduled_id: input.from_scheduled_id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// =====================================================================
// Scheduled Payments
// =====================================================================

export async function listScheduledPayments(categoryId: string): Promise<ScheduledPayment[]> {
  const { data, error } = await supabase
    .from('scheduled_payments')
    .select('*')
    .eq('category_id', categoryId)
    .order('due_date')
  if (error) throw error
  return (data ?? []) as ScheduledPayment[]
}

export async function createScheduledPayment(input: {
  event_id: string
  category_id: string
  due_date: string
  expected_amount: number
  expected_payer_id?: string | null
  note?: string
}): Promise<ScheduledPayment> {
  const { data, error } = await supabase
    .from('scheduled_payments')
    .insert({
      event_id: input.event_id,
      category_id: input.category_id,
      due_date: input.due_date,
      expected_amount: input.expected_amount,
      expected_payer_id: input.expected_payer_id ?? null,
      note: input.note ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ScheduledPayment
}

export async function markScheduledAsPaid(
  scheduledId: string,
  txn: { event_id: string; person_id: string | null; amount?: number; note?: string }
): Promise<{ scheduled: ScheduledPayment; transaction: Transaction }> {
  const { data: scheduled, error: schedErr } = await supabase
    .from('scheduled_payments')
    .select('*')
    .eq('id', scheduledId)
    .maybeSingle()
  if (schedErr || !scheduled) throw new Error('Scheduled payment not found')

  const paidAmount = txn.amount ?? scheduled.expected_amount
  if (paidAmount <= 0) throw new Error('Amount must be greater than 0')

  const transaction = await createTransaction({
    event_id: txn.event_id,
    category_id: scheduled.category_id,
    person_id: txn.person_id,
    amount: paidAmount,
    note: txn.note,
    from_scheduled_id: scheduledId,
  })

  // Partial payment: leave pending, reduce expected by what was paid so the
  // remaining shows up in upcoming lists. Full/over: mark paid.
  const updates =
    paidAmount < scheduled.expected_amount
      ? { expected_amount: scheduled.expected_amount - paidAmount }
      : { status: 'paid', paid_transaction_id: transaction.id }

  const { data: updatedScheduled, error: updateErr } = await supabase
    .from('scheduled_payments')
    .update(updates)
    .eq('id', scheduledId)
    .select('*')
    .single()
  if (updateErr) throw updateErr

  return {
    scheduled: updatedScheduled as ScheduledPayment,
    transaction,
  }
}

export async function deleteScheduledPayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// =====================================================================
// Event-wide queries (Summary / Upcoming tabs)
// =====================================================================

// All pending scheduled payments visible to the current user, due on or
// before today + daysForward. Used by the landing-page reminder card to
// surface overdue + soon-due items across all events the user is in.
export async function listAllUpcoming(daysForward = 7): Promise<UpcomingPayment[]> {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() + daysForward)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('scheduled_payments')
    .select(
      'id, event_id, category_id, due_date, expected_amount, expected_payer_id, note, categories(name), events(name), people:expected_payer_id(name)'
    )
    .eq('status', 'pending')
    .lte('due_date', cutoffStr)
    .order('due_date', { ascending: true })
    .limit(50)
  if (error) throw error
  type Row = {
    id: string
    event_id: string
    category_id: string
    due_date: string
    expected_amount: number
    expected_payer_id: string | null
    note: string | null
    categories: { name: string } | null
    events: { name: string } | null
    people: { name: string } | null
  }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    category_id: r.category_id,
    category_name: r.categories?.name ?? '',
    event_name: r.events?.name ?? '',
    due_date: r.due_date,
    expected_amount: r.expected_amount,
    expected_payer_id: r.expected_payer_id,
    expected_payer_name: r.people?.name ?? null,
    note: r.note,
  }))
}

export async function listEventUpcoming(eventId: string): Promise<UpcomingPayment[]> {
  const { data, error } = await supabase
    .from('scheduled_payments')
    .select(
      'id, event_id, category_id, due_date, expected_amount, expected_payer_id, note, categories(name), events(name), people:expected_payer_id(name)'
    )
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
  if (error) throw error
  type Row = {
    id: string
    event_id: string
    category_id: string
    due_date: string
    expected_amount: number
    expected_payer_id: string | null
    note: string | null
    categories: { name: string } | null
    events: { name: string } | null
    people: { name: string } | null
  }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    category_id: r.category_id,
    category_name: r.categories?.name ?? '',
    event_name: r.events?.name ?? '',
    due_date: r.due_date,
    expected_amount: r.expected_amount,
    expected_payer_id: r.expected_payer_id,
    expected_payer_name: r.people?.name ?? null,
    note: r.note,
  }))
}

export async function listPersonTotals(eventId: string): Promise<PersonTotals[]> {
  const { data, error } = await supabase
    .from('person_totals')
    .select('*')
    .eq('event_id', eventId)
    .order('paid_total', { ascending: false })
  if (error) throw error
  return (data ?? []) as PersonTotals[]
}

// =====================================================================
// Members and invites (event sharing)
// =====================================================================

export async function listEventMembers(eventId: string): Promise<EventMember[]> {
  // event_members.user_id and profiles.id both reference auth.users(id),
  // so PostgREST can't auto-join. Fetch separately and stitch.
  const { data: rows, error } = await supabase
    .from('event_members')
    .select('event_id, user_id, role, added_at')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('added_at', { ascending: true })
  if (error) throw error
  const members = (rows ?? []) as Array<{
    event_id: string
    user_id: string
    role: 'owner' | 'editor'
    added_at: string
  }>

  const userIds = members.map((m) => m.user_id)
  const nameById = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    if (profErr) throw profErr
    for (const p of (profs ?? []) as Array<{ id: string; display_name: string | null }>) {
      nameById.set(p.id, p.display_name)
    }
  }

  return members.map((m) => ({
    event_id: m.event_id,
    user_id: m.user_id,
    role: m.role,
    display_name: nameById.get(m.user_id) ?? null,
    added_at: m.added_at,
  }))
}

export async function listEventInvites(eventId: string): Promise<EventInvite[]> {
  const { data, error } = await supabase
    .from('event_invites')
    .select('id, event_id, invited_email, status, created_at')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EventInvite[]
}

export async function inviteByEmail(eventId: string, email: string): Promise<EventInvite> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) throw new Error('Email is required')
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('event_invites')
    .insert({
      event_id: eventId,
      invited_email: trimmed,
      invited_by: user.user.id,
    })
    .select('id, event_id, invited_email, status, created_at')
    .single()
  if (error) throw error
  return data as EventInvite
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('event_invites')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('id', inviteId)
  if (error) throw error
}

export async function removeMember(eventId: string, userId: string): Promise<void> {
  // event_members has a DELETE policy (owner-or-self) but no UPDATE policy,
  // so a soft-delete update would silently affect zero rows under RLS.
  const { error } = await supabase
    .from('event_members')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
  if (error) throw error
}
