'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Users, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import type { Location, AvailabilitySlot } from '@/types'

type Step = 'date' | 'guests' | 'location' | 'time' | 'details' | 'confirm'

const PARTY_SIZES = [1,2,3,4,5,6,7,8]
const OCCASIONS   = ['Sin ocasión especial','Cumpleaños','Aniversario','Cita','Celebración','Cena de negocios','Otro']

export default function ReservarPage() {
  const router   = useRouter()
  const [step, setStep]         = useState<Step>('date')
  const [loading, setLoading]   = useState(false)

  // Selecciones
  const [date, setDate]           = useState<string>('')
  const [partySize, setPartySize] = useState<number>(2)
  const [location, setLocation]   = useState<Location | ''>('')
  const [time, setTime]           = useState<string>('')
  const [availability, setAvailability] = useState<{ terraza: AvailabilitySlot[]; salon: AvailabilitySlot[] }>({ terraza: [], salon: [] })
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Datos del cliente
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('+506 ')
  const [email, setEmail]   = useState('')
  const [occasion, setOccasion] = useState(OCCASIONS[0])
  const [notes, setNotes]   = useState('')

  // Generar próximos 60 días disponibles para mostrar
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateOptions = Array.from({ length: 62 }, (_, i) => {
    const d = addDays(new Date(), i === 0 ? 1 : i)
    return format(d, 'yyyy-MM-dd')
  })

  // Cargar disponibilidad cuando cambia fecha, tamaño o ubicación
  useEffect(() => {
    if (!date || !partySize || step === 'time') fetchAvailability()
  }, [date, partySize])

  async function fetchAvailability() {
    if (!date) return
    setLoadingSlots(true)
    try {
      const [terr, sal] = await Promise.all([
        fetch(`/api/availability?date=${date}&party_size=${partySize}&location=terraza`).then(r => r.json()),
        fetch(`/api/availability?date=${date}&party_size=${partySize}&location=salon`).then(r => r.json()),
      ])
      setAvailability({ terraza: terr.slots ?? [], salon: sal.slots ?? [] })
    } catch {
      toast.error('Error al consultar disponibilidad')
    } finally {
      setLoadingSlots(false)
    }
  }

  const terrazaSlots = availability.terraza.filter(s => s.available)
  const salonSlots   = availability.salon.filter(s => s.available)

  async function handleConfirm() {
    if (!name.trim() || !phone.trim() || phone === '+506 ') {
      toast.error('Completá nombre y teléfono')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name, customer_phone: phone,
          customer_email: email || undefined,
          date, time, party_size: partySize,
          location, source: 'web',
          special_request: notes || undefined,
          occasion: occasion !== OCCASIONS[0] ? occasion : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al reservar'); return }

      // Redirigir a confirmación
      router.push(`/confirmacion?code=${data.reservation_code}&wa=${encodeURIComponent(data.whatsapp_link ?? '')}`)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const fmtDate = (d: string) => d ? format(parseISO(d), "EEEE d 'de' MMMM", { locale: es }) : ''
  const fmtTime = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    return `${h > 12 ? h-12 : h === 0 ? 12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  // ── STEPS ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cs-dark">
      {/* Header */}
      <header className="px-4 py-5 flex items-center gap-4 border-b border-cs-cream/10">
        <button onClick={() => {
          if (step === 'date') router.push('/')
          else setStep(prev => ({ guests:'date',location:'guests',time:'location',details:'time',confirm:'details' }[prev as string] as Step ?? 'date'))
        }} className="text-cs-cream/60 hover:text-cs-cream transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="font-display text-cs-cream font-medium text-lg">Cocoa Sushi</h1>
          <p className="text-cs-cream/50 text-xs tracking-widest uppercase">Reserva tu mesa</p>
        </div>
      </header>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-4">
        {(['date','guests','location','time','details','confirm'] as Step[]).map((s, i) => (
          <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-cs-olive w-6' : i < ['date','guests','location','time','details','confirm'].indexOf(step) ? 'bg-cs-olive/50' : 'bg-cs-cream/20'}`} />
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24 pt-4">

        {/* STEP 1: FECHA */}
        {step === 'date' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">¿Cuándo venís?</h2>
            <p className="text-cs-cream/50 text-sm mb-6">Seleccioná la fecha de tu visita</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">
              {dateOptions.map(d => {
                const label = format(parseISO(d), "EEE d MMM", { locale: es })
                return (
                  <button key={d}
                    onClick={() => { setDate(d); setStep('guests') }}
                    className={`py-3 px-2 rounded-xl text-sm font-medium text-center transition-all ${
                      d === date ? 'bg-cs-olive text-cs-dark' : 'bg-cs-cream/8 text-cs-cream hover:bg-cs-cream/15 border border-cs-cream/10'
                    }`}>
                    <span className="capitalize">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2: PERSONAS */}
        {step === 'guests' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">¿Cuántas personas?</h2>
            <p className="text-cs-cream/50 text-sm mb-6 capitalize">{fmtDate(date)}</p>
            <div className="grid grid-cols-4 gap-3">
              {PARTY_SIZES.map(n => (
                <button key={n} onClick={() => { setPartySize(n); setStep('location') }}
                  className={`aspect-square rounded-2xl text-xl font-semibold flex items-center justify-center transition-all ${
                    n === partySize ? 'bg-cs-olive text-cs-dark scale-105' : 'bg-cs-cream/8 text-cs-cream hover:bg-cs-cream/15 border border-cs-cream/10'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-cs-cream/40 text-xs mt-4 text-center">¿Más de 8 personas? Escribinos por WhatsApp</p>
          </div>
        )}

        {/* STEP 3: UBICACIÓN */}
        {step === 'location' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">¿Dónde preferís sentarte?</h2>
            <p className="text-cs-cream/50 text-sm mb-6 capitalize">{fmtDate(date)} · {partySize} personas</p>
            {loadingSlots && <p className="text-cs-cream/40 text-sm text-center my-8">Consultando disponibilidad…</p>}
            {!loadingSlots && (
              <div className="grid grid-cols-1 gap-4">
                {([
                  { id: 'terraza' as Location, label: 'Terraza', icon: '🌿', desc: 'Aire libre, ambiente natural', slots: terrazaSlots },
                  { id: 'salon' as Location,   label: 'Salón',   icon: '🍣', desc: 'Interior climatizado',       slots: salonSlots },
                ]).map(loc => {
                  const avail = loc.slots.length > 0
                  return (
                    <button key={loc.id}
                      disabled={!avail}
                      onClick={() => { setLocation(loc.id); setStep('time') }}
                      className={`p-5 rounded-2xl text-left transition-all border ${
                        avail
                          ? 'bg-cs-cream/8 border-cs-cream/10 hover:border-cs-olive hover:bg-cs-cream/15'
                          : 'opacity-40 cursor-not-allowed bg-cs-cream/4 border-cs-cream/5'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-2xl mb-2">{loc.icon}</div>
                          <h3 className="text-cs-cream font-semibold text-lg">{loc.label}</h3>
                          <p className="text-cs-cream/50 text-sm">{loc.desc}</p>
                        </div>
                        <div className="text-right">
                          {avail
                            ? <span className="text-cs-olive text-sm font-medium">{loc.slots.length} horarios disponibles</span>
                            : <span className="text-cs-cream/40 text-sm">Sin disponibilidad</span>
                          }
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: HORARIO */}
        {step === 'time' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">¿A qué hora?</h2>
            <p className="text-cs-cream/50 text-sm mb-6 capitalize">{fmtDate(date)} · {partySize} pers. · {location === 'terraza' ? 'Terraza' : 'Salón'}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(location === 'terraza' ? terrazaSlots : salonSlots).map(slot => (
                <button key={slot.time}
                  onClick={() => { setTime(slot.time); setStep('details') }}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    slot.time === time ? 'bg-cs-olive text-cs-dark' : 'bg-cs-cream/8 text-cs-cream hover:bg-cs-cream/15 border border-cs-cream/10'
                  }`}>
                  {fmtTime(slot.time)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: DATOS DEL CLIENTE */}
        {step === 'details' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">Tus datos</h2>
            <p className="text-cs-cream/50 text-sm mb-6">{fmtDate(date)} · {fmtTime(time)} · {partySize} pers.</p>
            <div className="space-y-4">
              <div>
                <label className="text-cs-cream/70 text-xs uppercase tracking-wider block mb-1.5">Nombre completo *</label>
                <input className="input bg-cs-cream/8 border-cs-cream/20 text-cs-cream placeholder-cs-cream/30"
                  value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <label className="text-cs-cream/70 text-xs uppercase tracking-wider block mb-1.5">Teléfono WhatsApp *</label>
                <input className="input bg-cs-cream/8 border-cs-cream/20 text-cs-cream placeholder-cs-cream/30"
                  value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+506 8888-1234" />
              </div>
              <div>
                <label className="text-cs-cream/70 text-xs uppercase tracking-wider block mb-1.5">Correo electrónico</label>
                <input className="input bg-cs-cream/8 border-cs-cream/20 text-cs-cream placeholder-cs-cream/30"
                  value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="text-cs-cream/70 text-xs uppercase tracking-wider block mb-1.5">Ocasión</label>
                <select className="select bg-cs-cream/8 border-cs-cream/20 text-cs-cream"
                  value={occasion} onChange={e => setOccasion(e.target.value)}>
                  {OCCASIONS.map(o => <option key={o} value={o} className="bg-cs-dark">{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-cs-cream/70 text-xs uppercase tracking-wider block mb-1.5">Comentarios especiales</label>
                <textarea className="input bg-cs-cream/8 border-cs-cream/20 text-cs-cream placeholder-cs-cream/30 resize-none h-20"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Alergias, solicitudes especiales, decoración…" />
              </div>
              <button onClick={() => name && phone !== '+506 ' ? setStep('confirm') : toast.error('Completá nombre y teléfono')}
                className="btn-primary w-full mt-2">Continuar</button>
            </div>
          </div>
        )}

        {/* STEP 6: CONFIRMACIÓN */}
        {step === 'confirm' && (
          <div>
            <h2 className="text-cs-cream text-2xl font-display font-medium mb-1">Confirmá tu reserva</h2>
            <p className="text-cs-cream/50 text-sm mb-6">Revisá los detalles antes de confirmar</p>
            <div className="bg-cs-cream/8 border border-cs-cream/15 rounded-2xl p-5 space-y-4 mb-6">
              {[
                ['Fecha', fmtDate(date)],
                ['Hora', fmtTime(time)],
                ['Personas', `${partySize} persona${partySize !== 1 ? 's' : ''}`],
                ['Ubicación', location === 'terraza' ? 'Terraza' : 'Salón'],
                ['Nombre', name],
                ['Teléfono', phone],
                ...(occasion && occasion !== OCCASIONS[0] ? [['Ocasión', occasion] as [string,string]] : []),
                ...(notes ? [['Notas', notes] as [string,string]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-cs-cream/50 text-sm flex-shrink-0">{k}</span>
                  <span className="text-cs-cream text-sm text-right capitalize">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-cs-cream/40 text-xs text-center mb-4">
              Recibirás confirmación por WhatsApp · La reserva tiene una duración de 2h30min
            </p>
            <button onClick={handleConfirm} disabled={loading} className="btn-primary w-full text-base py-4">
              {loading ? 'Procesando…' : 'Confirmar reservación →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
