import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: detalle de una reserva
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('reservations')
    .select('*, customer:customers(*), table:tables(*), history:reservation_history(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH: editar reserva
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db   = supabaseAdmin()
  const body = await req.json()

  // Si cambia fecha/hora/mesa, verificar disponibilidad
  if (body.table_id || body.date || body.reserved_time) {
    const { data: current } = await db.from('reservations').select('*').eq('id', params.id).single()
    if (!current) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    const checkDate  = body.date          ?? current.date
    const checkTime  = body.reserved_time ?? current.reserved_time
    const checkTable = body.table_id      ?? current.table_id

    const { data: cfg } = await db.from('restaurant_settings').select('value').eq('key','reservations').single()
    const dur = cfg?.value?.duration_minutes ?? 150

    const { data: avail } = await db.rpc('is_table_available', {
      p_table_id: checkTable, p_date: checkDate, p_time: checkTime,
      p_duration_min: dur, p_exclude_id: params.id,
    })

    if (!avail) return NextResponse.json({ error: 'Mesa no disponible para ese horario' }, { status: 409 })

    // Historial
    const changes = Object.keys(body)
    await db.from('reservation_history').insert({
      reservation_id: params.id, action: 'edited',
      old_values: current,
      new_values: body,
    })
  }

  const { data, error } = await db
    .from('reservations')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: cancelar reserva
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db   = supabaseAdmin()
  const body = await req.json().catch(() => ({}))

  const { data, error } = await db
    .from('reservations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: body.reason ?? 'Cancelada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .not('status', 'in', '("cancelled","finished")')
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 409 })

  await db.from('reservation_history').insert({
    reservation_id: params.id, action: 'cancelled',
    new_values: { reason: body.reason, cancelled_at: new Date().toISOString() },
  })

  return NextResponse.json({ success: true })
}
