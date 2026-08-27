// ─── Tipos globales del sistema ─────────────────────────────────

export type Location = 'terraza' | 'salon'
export type ReservationStatus = 'pending' | 'confirmed' | 'arrived' | 'finished' | 'cancelled' | 'noshow'
export type ReservationSource = 'web' | 'whatsapp' | 'instagram' | 'phone' | 'presencial' | 'admin'
export type TableStatus = 'available' | 'reserved' | 'occupied' | 'blocked'
export type AdminRole = 'admin' | 'manager' | 'staff'

export interface Table {
  id: string
  code: string
  location: Location
  capacity: number
  status: 'available' | 'blocked'
  notes?: string
  sort_order: number
  active: boolean
  current_status?: TableStatus        // de la vista v_table_status
  reservation_id?: string
  reservation_code?: string
  customer_name?: string
  party_size?: number
  reserved_time?: string
  arrival_time?: string
  expected_release_time?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  notes?: string
  visit_count: number
  created_at: string
}

export interface Reservation {
  id: string
  reservation_code: string
  customer_id: string
  customer?: Customer
  table?: Table
  date: string
  reserved_time: string
  party_size: number
  location: Location
  table_id: string
  status: ReservationStatus
  arrival_time?: string
  expected_release_time?: string
  actual_release_time?: string
  cancelled_at?: string
  cancel_reason?: string
  noshow_at?: string
  source: ReservationSource
  special_request?: string
  occasion?: string
  admin_notes?: string
  confirmed_at?: string
  created_at: string
  updated_at: string
}

export interface ReservationHistory {
  id: string
  reservation_id: string
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  performed_by?: string
  performed_at: string
  notes?: string
}

export interface BlockedDate {
  id: string
  date: string
  time_from?: string
  time_to?: string
  location?: Location | 'all'
  table_id?: string
  reason?: string
}

export interface RestaurantSettings {
  general: {
    name: string
    address: string
    phone: string
    whatsapp: string
    instagram: string
  }
  hours: Record<string, { open: boolean; from?: string; to?: string }>
  reservations: {
    duration_minutes: number
    tolerance_minutes: number
    max_party_size: number
    min_advance_hours: number
    max_advance_days: number
    slot_interval_minutes: number
    noshow_auto: boolean
  }
  notifications: {
    confirm_whatsapp: boolean
    confirm_email: boolean
    reminder_hours: number
    reminder_whatsapp: boolean
  }
}

// ─── API types ──────────────────────────────────────────────────

export interface AvailabilitySlot {
  time: string           // "19:00"
  available: boolean
  tables_available: number
}

export interface LocationAvailability {
  location: Location
  label: string
  slots: AvailabilitySlot[]
  total_tables: number
  available_tables: number
}

export interface CreateReservationPayload {
  customer_name: string
  customer_phone: string
  customer_email?: string
  date: string           // YYYY-MM-DD
  time: string           // HH:MM
  party_size: number
  location: Location
  table_id?: string      // opcional: el sistema asigna automáticamente
  source?: ReservationSource
  special_request?: string
  occasion?: string
}

export interface AdminStats {
  total_reservations: number
  total_guests: number
  tables_occupied: number
  tables_available: number
  pending: number
  confirmed: number
  arrived: number
  finished: number
  cancelled: number
  noshow: number
}
