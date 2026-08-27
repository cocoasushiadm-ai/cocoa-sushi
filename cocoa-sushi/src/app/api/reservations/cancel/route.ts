
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const { code, phone } = await req.json()

  if (!code || !phone) return NextResponse.json({ error: 'code y phone requeridos' }, { status: 400 })

  // Buscar reserva por código y teléfono del cliente
  const { data: reservation } = await sb.from('reservations')
    .select('*, customer:customers(*)')
    .eq('reservation_code', code).single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const custPhone = (reservation.customer as {phone: string})?.phone?.replace(/[\s\-+()]/g, '')
  const inputPhone = phone.replace(/[\s\-+()]/g, '')
  const match = custPhone?.endsWith(inputPhone) || inputPhone?.endsWith(custPhone ?? '')

  if (!match) return NextResponse.json({ error: 'Código o teléfono incorrectos' }, { status: 403 })

  if (['cancelled', 'finished', 'arrived'].includes(reservation.status)) {
    return NextResponse.json({ error: 'Esta reserva no puede cancelarse' }, { status: 409 })
  }

  const { data, error } = await sb.from('reservations').update({
    status: 'cancelled', cancelled_at: new Date().toISOString()
  }).eq('id', reservation.id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('reservation_history').insert({
    reservation_id: reservation.id, action: 'cancelled_by_customer',
    previous_status: reservation.status, new_status: 'cancelled',
    details: { cancelled_by: 'customer' }
  })

  return NextResponse.json({ success: true, reservation: data })
}

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const phone = searchParams.get('phone')

  if (!code || !phone) return NextResponse.json({ error: 'code y phone requeridos' }, { status: 400 })

  const { data: reservation } = await sb.from('reservations')
    .select('*, customer:customers(*), table:tables(*)')
    .eq('reservation_code', code).single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const custPhone = (reservation.customer as {phone: string})?.phone?.replace(/[\s\-+()]/g, '')
  const inputPhone = phone.replace(/[\s\-+()]/g, '')
  const match = custPhone?.endsWith(inputPhone) || inputPhone?.endsWith(custPhone ?? '')

  if (!match) return NextResponse.json({ error: 'Código o teléfono incorrectos' }, { status: 403 })

  return NextResponse.json({ reservation })
}
