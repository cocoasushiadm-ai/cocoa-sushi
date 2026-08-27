"use client"
import { useEffect, useState, useCallback } from 'react'
import { formatCountdown } from '@/lib/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { TZ } from '@/lib/utils'
import type { Table, Reservation, Customer } from '@/types'

type TableWithRes = Table & { current_reservation: (Reservation & { customer: Customer }) | null }

function TableCard({ t, onAction }: { t: TableWithRes; onAction: () => void }) {
  const r = t.current_reservation
  const [countdown, setCountdown] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (r?.status !== 'arrived' || !r.expected_release_time) return
    const update = () => setCountdown(formatCountdown(new Date(r.expected_release_time!)))
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [r])

  const stateColor = t.status === 'blocked' ? 'border-white/10 bg-white/5' :
    !r ? 'border-cs-medium/40 bg-cs-forest/10' :
    r.status === 'arrived' ? 'border-blue-500/40 bg-blue-900/20' :
    'border-amber-500/30 bg-amber-900/10'

  const stateLabel = t.status === 'blocked' ? '⚫ Bloqueada' :
    !r ? '🟢 Libre' :
    r.status === 'arrived' ? '🔴 Ocupada' :
    '🟡 Reservada'

  async function markArrival() {
    if (!r) return
    await fetch(`/api/reservations/${r.id}/arrival`, { method: 'POST' })
    onAction()
  }
  async function finish() {
    if (!r) return
    await fetch(`/api/reservations/${r.id}/finish`, { method: 'POST' })
    onAction()
  }

  return (
    <div className={`border rounded-lg p-3 cursor-pointer transition-all ${stateColor}`}
         onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start justify-between mb-1">
        <div className="font-mono font-bold text-cs-khaki">{t.code}</div>
        <div className="text-xs text-white/40">{t.capacity}p</div>
      </div>
      <div className="text-xs text-white/50 mb-2">{stateLabel}</div>

      {r && (
        <div>
          <div className="text-sm font-medium text-cs-cream truncate">{r.customer?.name}</div>
          <div className="text-xs text-white/40">{r.reserved_time?.slice(0,5)} · {r.party_size} pers.</div>
          {r.status === 'arrived' && countdown && (
            <div className="font-mono text-xs text-blue-300 mt-1">⏱ {countdown}</div>
          )}
          {r.special_request && (
            <div className="text-xs text-cs-copper/70 mt-1 italic truncate">"{r.special_request}"</div>
          )}
        </div>
      )}

      {expanded && r && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3" onClick={e => e.stopPropagation()}>
          {['pending','confirmed'].includes(r.status) && (
            <button onClick={markArrival} className="w-full text-xs bg-cs-forest text-white py-1.5 rounded hover:bg-cs-medium">
              ✓ Marcar llegada
            </button>
          )}
          {r.status === 'arrived' && (
            <button onClick={finish} className="w-full text-xs bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700">
              Finalizar mesa
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MapaPage() {
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [tables, setTables] = useState<TableWithRes[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/tables?date=${date}`)
    const data = await res.json()
    setTables(data.tables ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const terraza = tables.filter(t => t.location === 'terraza')
  const salon = tables.filter(t => t.location === 'salon')

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-medium text-cs-cream">Mapa de Mesas</h1>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="input py-1.5 text-sm w-auto" />
          <button onClick={load} className="btn-ghost text-sm">↻</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-xs text-white/50">
        <span>🟢 Libre</span><span>🟡 Reservada</span><span>🔴 Ocupada</span><span>⚫ Bloqueada</span>
        <span className="text-white/20">· Clic para ver detalles</span>
      </div>

      {loading ? <div className="text-white/40 text-center py-16">Cargando…</div> : (
        <div className="space-y-8">
          {[{ label: '🌿 Terraza', tables: terraza }, { label: '🏮 Salón', tables: salon }]
            .filter(s => s.tables.length > 0)
            .map(section => (
            <div key={section.label}>
              <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">{section.label}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {section.tables.map(t => (
                  <TableCard key={t.id} t={t} onAction={load} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
