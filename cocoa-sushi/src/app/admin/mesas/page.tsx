"use client"
import { useEffect, useState, useCallback } from 'react'
import type { Table } from '@/types'

export default function MesasPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [form, setForm] = useState({ code: '', location: 'terraza' as 'terraza'|'salon', capacity: 4, notes: '' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/tables')
    const data = await res.json()
    setTables(data.tables ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(t: Table) {
    setEditTable(t); setForm({ code: t.code, location: t.location, capacity: t.capacity, notes: t.notes ?? '' })
    setShowForm(true); setError('')
  }
  function startNew() {
    setEditTable(null); setForm({ code: '', location: 'terraza', capacity: 4, notes: '' })
    setShowForm(true); setError('')
  }

  async function save() {
    setError('')
    if (!form.code || !form.capacity) return setError('Código y capacidad son requeridos')
    const url = editTable ? `/api/tables/${editTable.id}` : '/api/tables'
    const method = editTable ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) return setError(data.error ?? 'Error al guardar')
    setShowForm(false); load()
  }

  async function toggleBlock(t: Table) {
    const newStatus = t.status === 'available' ? 'blocked' : 'available'
    await fetch(`/api/tables/${t.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus }) })
    load()
  }

  async function del(t: Table) {
    if (!confirm(`¿Eliminar "${t.code}"? No se puede deshacer.`)) return
    await fetch(`/api/tables/${t.id}`, { method: 'DELETE' })
    load()
  }

  const terraza = tables.filter(t => t.location === 'terraza')
  const salon = tables.filter(t => t.location === 'salon')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-cs-cream">Configuración de Mesas</h1>
        <button onClick={startNew} className="btn-primary text-sm py-2">＋ Agregar mesa</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-fade-in">
          <h2 className="text-cs-khaki font-medium mb-4">{editTable ? 'Editar mesa' : 'Nueva mesa'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Código *</label>
              <input className="input" placeholder="T07" value={form.code}
                onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Ubicación *</label>
              <select className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value as 'terraza'|'salon'}))}>
                <option value="terraza">Terraza</option>
                <option value="salon">Salón</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Capacidad *</label>
              <input className="input" type="number" min="1" max="30" value={form.capacity}
                onChange={e => setForm(f => ({...f, capacity: parseInt(e.target.value)}))} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Notas</label>
              <input className="input" placeholder="Ej: Junto a la barra" value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={save} className="btn-primary">Guardar</button>
          </div>
        </div>
      )}

      {/* Tables API PATCH endpoint */}
      {loading ? <div className="text-white/40 text-center py-16">Cargando…</div> : (
        <div className="space-y-8">
          {[{label: '🌿 Terraza', tables: terraza}, {label: '🏮 Salón', tables: salon}].map(section => (
            <div key={section.label}>
              <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">{section.label}</h2>
              <div className="card overflow-hidden">
                {section.tables.length === 0 ? (
                  <p className="p-4 text-white/30 text-sm">No hay mesas en esta área</p>
                ) : section.tables.map((t, i) => (
                  <div key={t.id} className={`flex items-center gap-4 px-4 py-3 ${i < section.tables.length-1 ? 'border-b border-white/5' : ''}`}>
                    <div className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm ${
                      t.status === 'blocked' ? 'bg-white/5 text-white/20' : 'bg-cs-forest/30 text-cs-khaki'
                    }`}>{t.code}</div>
                    <div className="flex-1">
                      <div className="text-sm text-cs-cream">{t.capacity} personas {t.notes && `· ${t.notes}`}</div>
                      <div className={`text-xs mt-0.5 ${t.status === 'blocked' ? 'text-red-400' : 'text-cs-olive'}`}>
                        {t.status === 'blocked' ? '⚫ Bloqueada' : '🟢 Disponible'}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(t)} className="text-xs border border-white/10 text-white/40 px-2 py-1 rounded hover:border-white/30 hover:text-white">Editar</button>
                      <button onClick={() => toggleBlock(t)} className={`text-xs px-2 py-1 rounded border ${
                        t.status === 'blocked'
                          ? 'border-cs-medium/40 text-cs-olive hover:bg-cs-forest/20'
                          : 'border-red-500/20 text-red-400/70 hover:bg-red-900/20'
                      }`}>{t.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}</button>
                      <button onClick={() => del(t)} className="text-xs border border-red-500/10 text-red-400/50 px-2 py-1 rounded hover:bg-red-900/10 hover:text-red-400">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
