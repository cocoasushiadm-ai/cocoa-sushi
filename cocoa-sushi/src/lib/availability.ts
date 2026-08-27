/**
 * availability.ts
 * Lógica central de disponibilidad de mesas.
 * Corre en el servidor (API route) usando el service role key.
 */
import { supabaseAdmin } from './supabase'
import type { Location, AvailabilitySlot, Table } from '@/types'
import { format, addMinutes, parseISO, isAfter, isBefore, parse } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'America/Costa_Rica'

/** Convierte "HH:MM" a minutos desde medianoche */
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Genera slots de tiempo entre from y to con intervalo dado */
function generateSlots(from: string, to: string, intervalMin: number, lastBookableOffset: number): string[] {
  const slots: string[] = []
  let cur = timeToMin(from)
  const end = timeToMin(to) - lastBookableOffset  // últimos N min sin nuevas reservas
  while (cur <= end) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`)
    cur += intervalMin
  }
  return slots
}

/**
 * Retorna las mesas disponibles para una fecha/hora/tamaño de grupo
 * considerando reservas existentes, duración y bloqueos.
 */
export async function getAvailableTables(
  date: string,
  time: string,
  partySize: number,
  location: Location,
  durationMin: number,
  excludeReservationId?: string,
): Promise<Table[]> {
  const db = supabaseAdmin()

  // 1. Obtener todas las mesas activas de esa ubicación con capacidad suficiente
  const { data: tables, error: tErr } = await db
    .from('tables')
    .select('*')
    .eq('location', location)
    .eq('active', true)
    .eq('status', 'available')   // no bloqueadas permanentemente
    .gte('capacity', partySize)
    .order('capacity', { ascending: true })  // preferir la más pequeña adecuada

  if (tErr || !tables?.length) return []

  // 2. Verificar bloqueos de fechas/horarios
  const { data: blocked } = await db
    .from('blocked_dates')
    .select('table_id, location')
    .eq('date', date)
    .or(`location.eq.all,location.eq.${location}`)

  const blockedTableIds = new Set(blocked?.map(b => b.table_id).filter(Boolean))
  const locationFullyBlocked = blocked?.some(b => !b.table_id && (b.location === location || b.location === 'all'))

  if (locationFullyBlocked) return []

  const availableTables = tables.filter(t => !blockedTableIds.has(t.id))

  // 3. Para cada mesa, verificar solapamiento con reservas existentes
  //    Ventana: [time, time + durationMin)
  const slotStart = fromZonedTime(parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date()), TZ)
  const slotEnd   = addMinutes(slotStart, durationMin)

  const { data: existingRes } = await db
    .from('reservations')
    .select('table_id, reserved_time, arrival_time, expected_release_time')
    .eq('date', date)
    .in('table_id', availableTables.map(t => t.id))
    .not('status', 'in', '("cancelled","noshow","finished")')

  const occupiedTableIds = new Set<string>()

  for (const res of existingRes ?? []) {
    if (excludeReservationId && (res as any).id === excludeReservationId) continue

    // Si el cliente llegó, usar expected_release_time como fin real
    const resStart = fromZonedTime(parse(`${date} ${res.reserved_time}`, 'yyyy-MM-dd HH:mm', new Date()), TZ)
    const resEnd   = res.expected_release_time
      ? new Date(res.expected_release_time)
      : addMinutes(resStart, durationMin)

    // Solapamiento: slotStart < resEnd AND slotEnd > resStart
    const overlaps = isBefore(slotStart, resEnd) && isAfter(slotEnd, resStart)
    if (overlaps) occupiedTableIds.add(res.table_id)
  }

  return availableTables.filter(t => !occupiedTableIds.has(t.id))
}

/**
 * Retorna todos los slots disponibles para una fecha, tamaño y ubicación.
 * Devuelve la estructura que usa el frontend.
 */
export async function getAvailabilityForDate(
  date: string,
  partySize: number,
  location: Location,
): Promise<AvailabilitySlot[]> {
  const db = supabaseAdmin()

  // Obtener configuración
  const { data: settings } = await db
    .from('restaurant_settings')
    .select('key, value')
    .in('key', ['hours', 'reservations'])

  const cfg = Object.fromEntries(settings?.map(s => [s.key, s.value]) ?? [])
  const reservationCfg = cfg.reservations ?? {}
  const hoursCfg       = cfg.hours ?? {}

  const durationMin  = reservationCfg.duration_minutes   ?? 150
  const intervalMin  = reservationCfg.slot_interval_minutes ?? 30
  const minAdvanceH  = reservationCfg.min_advance_hours   ?? 1

  // Día de la semana
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  const dayConfig = hoursCfg[dayNames[dayOfWeek]]

  if (!dayConfig?.open) return []

  const fromTime = dayConfig.from as string
  const toTime   = dayConfig.to   as string

  // Generar slots (reserva mínimo 30min antes del cierre)
  const rawSlots = generateSlots(fromTime, toTime, intervalMin, 30)

  // Filtrar slots que ya pasaron (según min_advance_hours)
  const nowCR = toZonedTime(new Date(), TZ)
  const minBookable = addMinutes(nowCR, minAdvanceH * 60)

  const results: AvailabilitySlot[] = []

  for (const slot of rawSlots) {
    const slotDt = fromZonedTime(parse(`${date} ${slot}`, 'yyyy-MM-dd HH:mm', new Date()), TZ)
    if (isBefore(slotDt, minBookable)) {
      results.push({ time: slot, available: false, tables_available: 0 })
      continue
    }

    const tables = await getAvailableTables(date, slot, partySize, location, durationMin)
    results.push({
      time: slot,
      available: tables.length > 0,
      tables_available: tables.length,
    })
  }

  return results
}

/**
 * Selecciona la mejor mesa para una reserva.
 * Prioriza la de capacidad más cercana al tamaño del grupo.
 */
export async function selectBestTable(
  date: string, time: string, partySize: number,
  location: Location, durationMin: number,
): Promise<Table | null> {
  const available = await getAvailableTables(date, time, partySize, location, durationMin)
  if (!available.length) return null
  // Ya vienen ordenadas por capacidad asc — la primera es la más ajustada
  return available[0]
}
