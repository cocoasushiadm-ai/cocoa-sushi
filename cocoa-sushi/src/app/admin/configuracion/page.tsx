"use client"
import { useEffect, useState } from 'react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS: Record<string, string> = {
  monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',
  friday:'Viernes',saturday:'Sábado',sunday:'Domingo'
}

interface Settings {
  restaurant?: { name: string; address: string; phone: string; whatsapp: string; instagram: string }
  hours?: Record<string, { open: boolean; from?: string; to?: string }>
  booking?: {
    durationMinutes: number; noShowToleranceMinutes: number; noShowAutomatic: boolean
    intervalMinutes: number; minAdvanceHours: number; maxAdvanceDays: number; maxPartySize: number
  }
  notifications?: {
    confirmationEnabled: boolean; reminderEnabled: boolean; reminderHoursBefore: number
    whatsappApiEnabled: boolean; whatsappApiToken: string; whatsappPhoneId: string
  }
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setSettings(d.settings ?? {})
      setLoading(false)
    })
  }, [])

  async function saveKey(key: string, value: unknown) {
    setSaving(key)
    await fetch('/api/admin/settings', {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key, value })
    })
    setSaving(null); setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  function upd(section: string, key: string, val: unknown) {
    setSettings(s => ({
      ...s,
      [section]: { ...(s as Record<string, unknown>)[section] as Record<string, unknown>, [key]: val }
    }))
  }

  function updHours(day: string, key: string, val: unknown) {
    setSettings(s => ({
      ...s,
      hours: { ...s.hours, [day]: { ...s.hours?.[day], [key]: val } }
    }))
  }

  if (loading) return <div className="text-white/40 text-center py-16">Cargando…</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-cs-cream mb-6">Configuración</h1>

      <div className="space-y-6">
        {/* Restaurante */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-cs-khaki font-medium">Restaurante</h2>
            <button onClick={() => saveKey('restaurant', settings.restaurant)} disabled={saving === 'restaurant'}
              className="btn-primary text-xs py-1.5 px-3">
              {saving === 'restaurant' ? 'Guardando…' : saved === 'restaurant' ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="grid gap-3">
            {[['name','Nombre'],['address','Dirección'],['phone','Teléfono'],['whatsapp','WhatsApp'],['instagram','Instagram']].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">{l}</label>
                <input className="input" value={(settings.restaurant as Record<string,string>)?.[k] ?? ''}
                  onChange={e => upd('restaurant', k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Horarios */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-cs-khaki font-medium">Horarios de operación</h2>
            <button onClick={() => saveKey('hours', settings.hours)} disabled={saving === 'hours'}
              className="btn-primary text-xs py-1.5 px-3">
              {saving === 'hours' ? 'Guardando…' : saved === 'hours' ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="space-y-2">
            {DAYS.map(day => {
              const d = settings.hours?.[day] ?? { open: false }
              return (
                <div key={day} className="flex items-center gap-3 flex-wrap">
                  <div className="w-24 text-sm text-white/60">{DAY_LABELS[day]}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={d.open} onChange={e => updHours(day, 'open', e.target.checked)}
                      className="w-4 h-4 rounded" />
                    <span className="text-xs text-white/50">Abierto</span>
                  </label>
                  {d.open && (
                    <>
                      <input type="time" value={d.from ?? '12:00'} onChange={e => updHours(day, 'from', e.target.value)}
                        className="input py-1 text-sm w-28" />
                      <span className="text-white/30 text-xs">a</span>
                      <input type="time" value={d.to ?? '21:00'} onChange={e => updHours(day, 'to', e.target.value)}
                        className="input py-1 text-sm w-28" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Reservas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-cs-khaki font-medium">Parámetros de reserva</h2>
            <button onClick={() => saveKey('booking', settings.booking)} disabled={saving === 'booking'}
              className="btn-primary text-xs py-1.5 px-3">
              {saving === 'booking' ? 'Guardando…' : saved === 'booking' ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['durationMinutes', 'Duración de reserva (minutos)', 1],
              ['noShowToleranceMinutes', 'Tolerancia No Show (minutos)', 1],
              ['intervalMinutes', 'Intervalo entre reservas (min)', 5],
              ['minAdvanceHours', 'Anticipación mínima (horas)', 0],
              ['maxAdvanceDays', 'Anticipación máxima (días)', 1],
              ['maxPartySize', 'Máximo de personas por reserva', 1],
            ].map(([k, l, step]) => (
              <div key={k as string}>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">{l}</label>
                <input className="input" type="number" min={step as number}
                  value={(settings.booking as Record<string,number>)?.[k as string] ?? ''}
                  onChange={e => upd('booking', k as string, parseInt(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" id="noshow-auto"
              checked={settings.booking?.noShowAutomatic ?? false}
              onChange={e => upd('booking', 'noShowAutomatic', e.target.checked)} />
            <label htmlFor="noshow-auto" className="text-sm text-white/60 cursor-pointer">
              No Show automático al cumplirse la tolerancia
            </label>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-cs-khaki font-medium">Integración WhatsApp</h2>
            <button onClick={() => saveKey('notifications', settings.notifications)} disabled={saving === 'notifications'}
              className="btn-primary text-xs py-1.5 px-3">
              {saving === 'notifications' ? 'Guardando…' : saved === 'notifications' ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 mb-4 text-xs text-amber-400">
            Para envío automático se requiere WhatsApp Business Cloud API (Meta). Por ahora el sistema
            genera un enlace wa.me con el mensaje prellenado.
          </div>
          <div className="space-y-3">
            {[
              ['whatsappApiToken', 'API Token (Bearer)', 'eyJhbGc…'],
              ['whatsappPhoneId', 'Phone Number ID', '123456789'],
            ].map(([k, l, p]) => (
              <div key={k as string}>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">{l}</label>
                <input className="input" type="password" placeholder={p as string}
                  value={(settings.notifications as Record<string,string>)?.[k as string] ?? ''}
                  onChange={e => upd('notifications', k as string, e.target.value)} />
              </div>
            ))}
            <div className="flex gap-4">
              {[['confirmationEnabled','Confirmaciones automáticas'],['reminderEnabled','Recordatorios']].map(([k,l]) => (
                <label key={k as string} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={(settings.notifications as Record<string,boolean>)?.[k as string] ?? false}
                    onChange={e => upd('notifications', k as string, e.target.checked)} />
                  <span className="text-sm text-white/60">{l}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
