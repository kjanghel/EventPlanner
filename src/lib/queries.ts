import { supabase } from './supabase'

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
  negotiated_total: number
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
  negotiated_amount: number | null
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
  note: string | null
}

// =====================================================================
// Events
// =====================================================================

export async function listMyEvents(): Promise<EventTotals[]> {
  const { data, error } = await supabase
    .from('event_totals')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as EventTotals[]
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

export async function createCategory(eventId: string, input: {
  name: string
  planned_amount?: number | null
  negotiated_amount?: number | null
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
      negotiated_amount: input.negotiated_amount ?? null,
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
    negotiated_amount?: number | null
    note?: string | null
  }
): Promise<Category> {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.planned_amount !== undefined) updates.planned_amount = input.planned_amount
  if (input.negotiated_amount !== undefined) updates.negotiated_amount = input.negotiated_amount
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
