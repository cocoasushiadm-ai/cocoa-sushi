"use client"
import { useEffect, useState, useCallback } from 'react'
import { formatCountdown } from '@/lib/utils'
import type { DashboardStats, Reservation } from '@/types'
import { formatInTimeZone } from 'date-fns-tz'
import { TZ } from '@/lib/utils'

function StatCard({ label, value, sub, color = '' }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className={`text-2xl md:text-3xl font-bold mb-1 ${color || 'text-cs-khaki'}`}>{value}</div>
      <div className="text-sm text-white/60">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  )
}

function ReservationRow({ r, onAction }: { r: Reservation & { customer?: {name:string;phone:string}, table?: {code:string} }; onAction: () => void }) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (r.status !== 'arrived' || !r.expected_release_time) return
    const update = () => setCountdown(formatCountdown(new Date(r.expected_release_time!)))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [r])

  async function action(endpoint: string) {
    await fetch(`/api/reservations/${r.id}/${endpoint}`, { method: 'POST' })
    onAction()
  }
  async function cancel() {
    if (!confirm('¿Cancelar esta reserva?')) return
    await fetch(`/api/reservations/${r.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status:'cancelled'}) })
    onAction()
  }

  return (
    <div className={`card p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${r.status === 'cancelled' ? 'opacity-40' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-cs-cream">{r.customer?.name ?? '—'}</span>
          <span className={`badge-${r.status}`}>{r.status === 'pending' ? 'Pendiente' : r.status === 'confirmed' ? 'Confirmada' : r.status === 'arrived' ? 'Llegó' : r.status === 'no_show' ? 'No Show' : r.status === 'finished' ? 'Finalizada' : 'Cancelada'}</span>
          {r.occasion && <span className="text-xs text-cs-copper">✨ {r.occasion}</span>}
        </div>
        <div className="text-xs text-white/40 mt-0.5 flex gap-3">
          <span>{r.reserved_time?.slice(0,5)}</span>
          <span>{r.party_size} pers.</span>
          <span className="capitalize">{r.location === 'terraza' ? 'Terraza' : 'Salón'}</span>
          {r.table && <span className="text-cs-khaki">{(r.table as {code:string}).code}</span>}
          <span className="font-mono text-white/20">{r.reservation_code}</span>
        </div>
        {r.special_request && <div className="text-xs text-white/30 mt-1 italic">"{r.special_request}"</div>}
        {r.status === 'arrived' && countdown && (
          <div className="text-xs text-blue-300 mt-1 font-mono">⏱ {countdown} restantes</div>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap flex-shrink-0">
        {['pending','confirmed'].includes(r.status) && (
          <button onClick={() => action('arrival')} className="text-xs bg-cs-forest text-white px-2.5 py-1.5 rounded hover:bg-cs-medium">✓ Llegó</button>
        )}
        {r.status === 'arrived' && (
          <button onClick={() => action('finish')} className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700">Finalizar</button>
        )}
        {['pending','confirmed'].includes(r.status) && (
          <button onClick={() => action('noshow')} className="text-xs bg-red-900/50 text-red-400 px-2.5 py-1.5 rounded hover:bg-red-900">No Show</button>
        )}
        {!['cancelled','finished','no_show'].includes(r.status) && (
          <button onClick={cancel} className="text-xs border border-white/10 text-white/30 px-2.5 py-1.5 rounded hover:border-red-500/30 hover:text-red-400">✕</button>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [newResOpen, setNewResOpen] = useState(false)

  const load = useCallback(async () => {
    const [sRes, rRes] = await Promise.all([
      fetch(`/api/admin/stats?date=${today}`),
      fetch(`/api/reservations?date=${today}`)
    ])
    const sData = await sRes.json()
    const rData = await rRes.json()
    setStats(sData)
    setReservations(rData.reservations ?? [])
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/admin/release', { method: 'POST' }).then(load)
    }, 60000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <div className="text-white/40 text-center py-16">Cargando…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-cs-cream">Dashboard</h1>
          <p className="text-xs text-white/30 mt-0.5 capitalize">
            {new Date(today+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">↻ Actualizar</button>
          <a href="/admin/reservas?new=1" className="btn-primary text-sm py-2">＋ Reserva</a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Reservas hoy" value={stats?.reservations_today ?? 0} />
        <StatCard label="Personas" value={stats?.people_today ?? 0} />
        <StatCard label="Mesas ocupadas" value={`${stats?.tables_occupied ?? 0} / ${stats?.tables_total ?? 0}`} />
        <StatCard label="Pendientes" value={stats?.pending ?? 0} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6 text-center">
        {[
          { label: 'Confirmadas', val: stats?.confirmed ?? 0, cls: 'text-cs-khaki' },
          { label: 'Llegaron', val: stats?.arrived ?? 0, cls: 'text-blue-300' },
          { label: 'No Show', val: stats?.no_show ?? 0, cls: 'text-red-400' },
          { label: 'Canceladas', val: stats?.cancelled ?? 0, cls: 'text-white/30' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div className={`text-xl font-bold ${s.cls}`}>{s.val}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reservations today */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-white/70 font-medium">Reservas del día</h2>
        <a href="/admin/mapa" className="text-xs text-cs-olive hover:text-cs-khaki">Ver mapa de mesas →</a>
      </div>

      {reservations.length === 0 ? (
        <div className="card p-8 text-center text-white/30">No hay reservas para hoy</div>
      ) : (
        <div className="space-y-2">
          {reservations.map(r => (
            <ReservationRow key={r.id} r={r as never} onAction={load} />
          ))}
        </div>
      )}
    </div>
  )
}
