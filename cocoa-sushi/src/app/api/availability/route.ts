import { NextRequest, NextResponse } from 'next/server'
import { getAvailabilityForDate } from '@/lib/availability'
import { supabaseAdmin } from '@/lib/supabase'
import type { Location } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date      = searchParams.get('date')
  const partySz   = parseInt(searchParams.get('party_size') ?? '0')
  const location  = searchParams.get('location') as Location | null

  if (!date || !partySz || !location) {
    return NextResponse.json({ error: 'Parámetros faltantes: date, party_size, location' }, { status: 400 })
  }

  try {
    const slots = await getAvailabilityForDate(date, partySz, location)

    // Contar mesas totales y disponibles en algún slot
    const db = supabaseAdmin()
    const { count: totalTables } = await db
      .from('tables')
      .select('*', { count: 'exact', head: true })
      .eq('location', location)
      .eq('active', true)

    const maxAvailable = Math.max(...slots.map(s => s.tables_available), 0)

    return NextResponse.json({
      date, location, party_size: partySz,
      slots,
      total_tables: totalTables ?? 0,
      max_available: maxAvailable,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
