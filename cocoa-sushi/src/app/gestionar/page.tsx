"use client"
import { useState } from 'react'
import { statusLabel } from '@/lib/utils'
import type { Reservation } from '@/types'

export default function GestionarPage() {
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  async function search() {
    setLoading(true); setError(''); setReservation(null)
    const res = await fetch(`/api/reservations/cancel?code=${code.trim()}&phone=${phone.trim()}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error ?? 'No encontramos tu reserva')
    setReservation(data.reservation)
  }

  async function cancel() {
    if (!reservation) return
    if (!confirm('¿Confirmás la cancelación de tu reserva?')) return
    setLoading(true)
    const res = await fetch('/api/reservations/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, phone: phone.trim() })
    })
    setLoading(false)
    if (res.ok) setCancelled(true)
    else setError('No se pudo cancelar. Contactanos directamente.')
  }

  return (
    <div className="min-h-screen bg-cs-dark">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-lg mx-auto">
          <div className="font-display text-xl text-cs-khaki">Cocoa Sushi</div>
          <div className="text-xs text-white/40 tracking-widest uppercase mt-0.5">Gestionar mi reserva</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {cancelled ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-2xl text-cs-khaki mb-2">Reserva cancelada</h2>
            <p className="text-white/50 mb-6">Tu reserva ha sido cancelada exitosamente.</p>
            <a href="/" className="btn-primary">Hacer nueva reserva</a>
          </div>
        ) : !reservation ? (
          <div>
            <h1 className="font-display text-2xl text-cs-cream mb-6">Buscá tu reserva</h1>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Código de reserva *</label>
                <input className="input" placeholder="CS-20260826-001" value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Teléfono *</label>
                <input className="input" placeholder="8888-1234" value={phone}
                  onChange={e => setPhone(e.target.value)} />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={search} disabled={loading || !code || !phone}
                className="btn-primary w-full">
                {loading ? 'Buscando…' : 'Buscar reserva'}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl text-cs-khaki mb-4">Tu reserva</h2>
            <div className="card p-5 space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-mono text-cs-copper">{reservation.reservation_code}</span>
                <span className={`badge-${reservation.status}`}>{statusLabel(reservation.status)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/40">Fecha</span><span>{reservation.date}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Hora</span><span>{reservation.reserved_time?.slice(0,5)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Personas</span><span>{reservation.party_size}</span></div>
                <div className="flex justify-between capitalize"><span className="text-white/40">Ubicación</span>
                  <span>{reservation.location === 'terraza' ? 'Terraza' : 'Salón'}</span></div>
                {reservation.table && (
                  <div className="flex justify-between"><span className="text-white/40">Mesa</span>
                    <span>{(reservation.table as {code:string}).code}</span></div>
                )}
              </div>
            </div>
            {['pending','confirmed'].includes(reservation.status) && (
              <button onClick={cancel} disabled={loading}
                className="w-full border border-red-500/30 text-red-400 py-3 rounded hover:bg-red-500/10 transition-colors">
                {loading ? 'Cancelando…' : 'Cancelar mi reserva'}
              </button>
            )}
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            <button onClick={() => setReservation(null)} className="btn-ghost w-full mt-3">← Buscar otra</button>
          </div>
        )}
      </main>
    </div>
  )
}
