import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { selectBestTable } from '@/lib/availability'
import { sendWhatsAppMessage, buildConfirmationMessage, buildWhatsAppLink } from '@/lib/whatsapp'
import { format, parse } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { CreateReservationPayload, Location } from '@/types'

// GET: listar reservas (admin)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date     = searchParams.get('date')
  const status   = searchParams.get('status')
  const location = searchParams.get('location')
  const limit    = parseInt(searchParams.get('limit') ?? '100')
  const page     = parseInt(searchParams.get('page') ?? '1')

  const db = supabaseAdmin()
  let q = db
    .from('reservations')
    .select(`*, customer:customers(*), table:tables(*)`, { count: 'exact' })
    .order('reserved_time', { ascending: true })
    .range((page-1)*limit, page*limit-1)

  if (date)     q = q.eq('date', date)
  if (status)   q = q.eq('status', status)
  if (location) q = q.eq('location', location)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, limit })
}

// POST: crear reserva
export async function POST(req: NextRequest) {
  let body: CreateReservationPayload
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { customer_name, customer_phone, customer_email,
          date, time, party_size, location, table_id,
          source = 'web', special_request, occasion } = body

  if (!customer_name || !customer_phone || !date || !time || !party_size || !location) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Obtener configuración de duración
  const { data: cfg } = await db.from('restaurant_settings').select('value').eq('key', 'reservations').single()
  const durationMin: number = cfg?.value?.duration_minutes ?? 150

  // Seleccionar mesa si no se especificó
  let finalTableId = table_id
  if (!finalTableId) {
    const bestTable = await selectBestTable(date, time, party_size, location as Location, durationMin)
    if (!bestTable) {
      return NextResponse.json({ error: 'No hay mesas disponibles para esa fecha, hora y cantidad de personas' }, { status: 409 })
    }
    finalTableId = bestTable.id
  }

  // Llamar función SQL atómica (previene overbooking)
  const { data: result } = await db.rpc('create_reservation', {
    p_customer_name:   customer_name,
    p_customer_phone:  customer_phone,
    p_customer_email:  customer_email ?? null,
    p_date:            date,
    p_time:            time,
    p_party_size:      party_size,
    p_location:        location,
    p_table_id:        finalTableId,
    p_source:          source,
    p_special_request: special_request ?? null,
    p_occasion:        occasion ?? null,
    p_created_by:      null,
  })

  if (!result?.success) {
    return NextResponse.json({ error: result?.error ?? 'Error al crear la reserva' }, { status: 409 })
  }

  // Obtener datos completos para WhatsApp
  const { data: res } = await db
    .from('reservations')
    .select('*, customer:customers(*), table:tables(*)')
    .eq('id', result.reservation_id)
    .single()

  // Enviar confirmación por WhatsApp
  let whatsappLink: string | undefined
  if (res && customer_phone) {
    const notifCfg = await db.from('restaurant_settings').select('value').eq('key','notifications').single()
    const sendWA   = notifCfg.data?.value?.confirm_whatsapp ?? true

    const dateLabel = format(toZonedTime(new Date(date + 'T12:00:00'), 'America/Costa_Rica'), "d 'de' MMMM 'de' yyyy")
    const [h, m]    = time.split(':').map(Number)
    const timeLabel = `${h > 12 ? h-12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
    const msg       = buildConfirmationMessage({
      customer_name: customer_name,
      reservation_code: result.reservation_code,
      date: dateLabel, time: timeLabel,
      party_size, location,
      table_code: res.table?.code ?? finalTableId,
    })

    if (sendWA) {
      const waRes = await sendWhatsAppMessage(customer_phone, msg)
      if (!waRes.success) whatsappLink = buildWhatsAppLink(customer_phone, msg)
      // Registrar en notifications
      await db.from('notifications').insert({
        reservation_id: result.reservation_id,
        type: 'confirmation', channel: 'whatsapp',
        recipient: customer_phone, message: msg,
        status: waRes.success ? 'sent' : 'failed',
        sent_at: waRes.success ? new Date().toISOString() : null,
        error: waRes.error ?? null,
      })
    } else {
      whatsappLink = buildWhatsAppLink(customer_phone, msg)
    }
  }

  return NextResponse.json({
    success: true,
    reservation_id:   result.reservation_id,
    reservation_code: result.reservation_code,
    whatsapp_link:    whatsappLink,
    reservation: res,
  }, { status: 201 })
}
