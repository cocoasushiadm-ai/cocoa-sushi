"use client"
import { useState, useEffect } from 'react'
import type { Table } from '@/types'

const OCCASIONS = ['','Cumpleaños','Aniversario','Reunión de negocios','Celebración','Romántica','Otra']
const SOURCES = ['web','whatsapp','instagram','phone','admin','presencial']
const SOURCE_LABELS: Record<string, string> = {
  web:'Web', whatsapp:'WhatsApp', instagram:'Instagram',
  phone:'Teléfono', admin:'Admin', presencial:'Presencial'
}

export default function NewReservationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', date: new Date().toISOString().split('T')[0],
    time: '19:00', party_size: 2, location: 'salon' as 'terraza'|'salon',
    special_request: '', occasion: '', source: 'admin', table_id: '', internal_notes: ''
  })

  useEffect(() => {
    fetch(`/api/tables?location=${form.location}`).then(r => r.json()).then(d => setTables(d.tables ?? []))
  }, [form.location])

  function upd(k: string, v: unknown) { setForm(f => ({...f, [k]: v})); setError('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error ?? 'Error al crear la reserva')
    onCreated(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-cs-dark border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-cs-khaki font-medium">Nueva Reserva</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Nombre *</label>
              <input className="input" placeholder="Nombre completo" required
                value={form.name} onChange={e => upd('name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Teléfono *</label>
              <input className="input" placeholder="8888-1234" required
                value={form.phone} onChange={e => upd('phone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Personas *</label>
              <input className="input" type="number" min="1" max="20" required
                value={form.party_size} onChange={e => upd('party_size', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Fecha *</label>
              <input className="input" type="date" required
                value={form.date} onChange={e => upd('date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Hora *</label>
              <input className="input" type="time" required
                value={form.time} onChange={e => upd('time', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Ubicación *</label>
              <select className="input" value={form.location} onChange={e => upd('location', e.target.value)}>
                <option value="terraza">Terraza</option>
                <option value="salon">Salón</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Mesa (opcional)</label>
              <select className="input" value={form.table_id} onChange={e => upd('table_id', e.target.value)}>
                <option value="">Auto-asignar</option>
                {tables.filter(t => t.capacity >= form.party_size).map(t => (
                  <option key={t.id} value={t.id}>{t.code} ({t.capacity} pers.)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Origen</label>
              <select className="input" value={form.source} onChange={e => upd('source', e.target.value)}>
                {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Ocasión</label>
              <select className="input" value={form.occasion} onChange={e => upd('occasion', e.target.value)}>
                {OCCASIONS.map(o => <option key={o} value={o}>{o || 'Ninguna'}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Solicitudes especiales</label>
              <textarea className="input h-16 resize-none" placeholder="Alergias, preferencias…"
                value={form.special_request} onChange={e => upd('special_request', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Notas internas</label>
              <textarea className="input h-14 resize-none" placeholder="Solo visible para el admin"
                value={form.internal_notes} onChange={e => upd('internal_notes', e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creando…' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
