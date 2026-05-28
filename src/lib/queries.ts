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
