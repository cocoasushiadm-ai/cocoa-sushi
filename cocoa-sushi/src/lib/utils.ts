import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, addMinutes } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import type { ReservationStatus, TableLocation } from '@/types'

export const TZ = 'America/Costa_Rica'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fecha/hora en zona horaria de CR
export function nowInCR(): Date {
  return toZonedTime(new Date(), TZ)
}

export function formatDateCR(date: string | Date, fmt = "d 'de' MMMM yyyy"): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, TZ, fmt, { locale: undefined })
}

export function formatTimeCR(time: string): string {
  // time = "HH:MM:SS" o "HH:MM"
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

// Calcular hora de liberación (arrival + durationMinutes)
export function calcReleaseTime(arrivalTime: string, durationMinutes = 150): Date {
  return addMinutes(new Date(arrivalTime), durationMinutes)
}

// Tiempo restante en formato HH:MM:SS
export function formatCountdown(releaseTime: Date): string {
  const now = new Date()
  const diffMs = releaseTime.getTime() - now.getTime()
  if (diffMs <= 0) return '00:00:00'
  const totalSeconds = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(n => n.toString().padStart(2, '0')).join(':')
}

// Generar horarios disponibles
export function generateTimeSlots(from: string, to: string, intervalMinutes: number): string[] {
  const slots: string[] = []
  const [fromH, fromM] = from.split(':').map(Number)
  const [toH, toM] = to.split(':').map(Number)
  let current = fromH * 60 + fromM
  const end = toH * 60 + toM
  while (current < end) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    current += intervalMinutes
  }
  return slots
}

export function statusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    pending: 'Pendiente', confirmed: 'Confirmada', arrived: 'Llegó',
    no_show: 'No Show', finished: 'Finalizada', cancelled: 'Cancelada'
  }
  return labels[status] ?? status
}

export function statusColor(status: ReservationStatus): string {
  const colors: Record<ReservationStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-cs-medium/10 text-cs-forest',
    arrived: 'bg-blue-100 text-blue-800',
    no_show: 'bg-red-100 text-red-700',
    finished: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-gray-100 text-gray-500 line-through'
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function locationLabel(loc: TableLocation): string {
  return loc === 'terraza' ? 'Terraza' : 'Salón'
}

// Validar teléfono Costa Rica: 8 dígitos, empieza con 2,4,6,7,8
export function isValidCRPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '')
  const cr = cleaned.startsWith('506') ? cleaned.slice(3) : cleaned
  return /^[2467]\d{7}$/.test(cr) || /^[8]\d{7}$/.test(cr)
}

export function formatCRPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '')
  const digits = cleaned.startsWith('506') ? cleaned.slice(3) : cleaned
  return `+506 ${digits.slice(0,4)}-${digits.slice(4)}`
}

// Generar enlace de WhatsApp
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

// Mensaje de confirmación para WhatsApp
export function generateConfirmationMessage(params: {
  name: string; date: string; time: string; party_size: number
  location: string; table_code?: string; code: string
}): string {
  return `Hola, ${params.name} 👋

Tu reservación en *Cocoa Sushi* ha sido confirmada ✅

📅 Fecha: ${params.date}
🕐 Hora: ${params.time}
👥 Personas: ${params.party_size}
📍 Ubicación: ${params.location}
${params.table_code ? `🍣 Mesa: ${params.table_code}
` : ''}
📋 Código de reserva:
*${params.code}*

Te esperamos en Cocoa Sushi.

Si necesitas cancelar o modificar tu reservación, contáctanos.

¡Gracias por elegir Cocoa Sushi! ❤️`
}

// Verificar si una fecha/hora ya pasó la ventana de disponibilidad
export function isPastSlot(date: string, time: string, minAdvanceHours = 1): boolean {
  const slotDate = new Date(`${date}T${time}:00-06:00`)
  const minAdvance = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000)
  return slotDate < minAdvance
}
