import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

export async function GET() {
  const db  = supabaseAdmin()
  const today = format(toZonedTime(new Date(), 'America/Costa_Rica'), 'yyyy-MM-dd')

  const [resResult, tablesResult] = await Promise.all([
    db.from('reservations')
      .select('status, party_size')
      .eq('date', today),
    db.from('v_table_status').select('current_status'),
  ])

  const reservations = resResult.data ?? []
  const tables       = tablesResult.data ?? []

  const byStatus = (s: string) => reservations.filter(r => r.status === s)

  return NextResponse.json({
    today,
    total_reservations: reservations.filter(r => !['cancelled','noshow'].includes(r.status)).length,
    total_guests:       reservations.filter(r => !['cancelled','noshow'].includes(r.status))
                                    .reduce((s, r) => s + (r.party_size ?? 0), 0),
    pending:   byStatus('pending').length,
    confirmed: byStatus('confirmed').length,
    arrived:   byStatus('arrived').length,
    finished:  byStatus('finished').length,
    cancelled: byStatus('cancelled').length,
    noshow:    byStatus('noshow').length,
    tables_occupied:  tables.filter(t => t.current_status === 'occupied').length,
    tables_reserved:  tables.filter(t => t.current_status === 'reserved').length,
    tables_available: tables.filter(t => t.current_status === 'available').length,
    tables_blocked:   tables.filter(t => t.current_status === 'blocked').length,
  })
}
