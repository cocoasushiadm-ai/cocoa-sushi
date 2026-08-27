"use client"
import { useEffect, useState, useCallback } from 'react'
import { statusLabel, locationLabel, formatTimeCR } from '@/lib/utils'
import type { Reservation } from '@/types'
import { formatInTimeZone } from 'date-fns-tz'
import { TZ } from '@/lib/utils'
import NewReservationModal from '@/components/admin/NewReservationModal'

const STATUS_OPTS = ['Todos','pending','confirmed','arrived','no_show','finished','cancelled']
const STATUS_LABELS: Record<string, string> = {
  'Todos':'Todos','pending':'Pendiente','confirmed':'Confirmada',
  'arrived':'Llegó','no_show':'No Show','finished':'Finalizada','cancelled':'Cancelada'
}

export default function ReservasPage() {
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [status, setStatus] = useState('Todos')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Reservation | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ date })
    if (status !== 'Todos') q.set('status', status)
    const res = await fetch(`/api/reservations?${q}`)
    const data = await res.json()
    setReservations(data.reservations ?? [])
    setLoading(false)
  }, [date, status])

  useEffect(() => { load() }, [load])

  async function action(id: string, endpoint: string) {
    await fetch(`/api/reservations/${id}/${endpoint}`, { method: 'POST' })
    load()
  }
  async function cancel(id: string) {
    if (!confirm('¿Cancelar esta reserva?')) return
    await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'cancelled'}) })
    load()
  }

  return (
    <div>
      {showNew && <NewReservationModal onClose={() => setShowNew(false)} onCreated={load} />}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-medium text-cs-cream">Reservas</h1>
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="input py-1.5 text-sm w-auto" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="input py-1.5 text-sm w-auto">
            {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm py-1.5">＋ Nueva</button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-16">Cargando…</div>
      ) : reservations.length === 0 ? (
        <div className="card p-8 text-center text-white/30">No hay reservas para este criterio</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Hora</th>
                  <th className="text-left px-4 py-3">Pers.</th>
                  <th className="text-left px-4 py-3">Ubic.</th>
                  <th className="text-left px-4 py-3">Mesa</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{r.reservation_code}</td>
                    <td className="px-4 py-3">
                      <div className="text-cs-cream font-medium">{r.customer?.name ?? '—'}</div>
                      <div className="text-xs text-white/30">{r.customer?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.reserved_time?.slice(0,5)}</td>
                    <td className="px-4 py-3 text-center text-white/70">{r.party_size}</td>
                    <td className="px-4 py-3 capitalize text-white/60">{r.location === 'terraza' ? 'Terraza' : 'Salón'}</td>
                    <td className="px-4 py-3 text-cs-khaki font-medium">{r.table ? (r.table as {code:string}).code : '—'}</td>
                    <td className="px-4 py-3"><span className={`badge-${r.status}`}>{statusLabel(r.status)}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {['pending','confirmed'].includes(r.status) && (
                          <button onClick={() => action(r.id,'arrival')} className="text-xs bg-cs-forest text-white px-2 py-1 rounded hover:bg-cs-medium">✓ Llegó</button>
                        )}
                        {r.status === 'arrived' && (
                          <button onClick={() => action(r.id,'finish')} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Finalizar</button>
                        )}
                        {['pending','confirmed'].includes(r.status) && (
                          <button onClick={() => action(r.id,'noshow')} className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded">No Show</button>
                        )}
                        {!['cancelled','finished','no_show'].includes(r.status) && (
                          <button onClick={() => cancel(r.id)} className="text-xs border border-white/10 text-white/30 px-2 py-1 rounded hover:border-red-400/50 hover:text-red-400">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
