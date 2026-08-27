import Link from 'next/link'
import { CalendarDays, Clock, MapPin, Phone } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-cs-dark flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="border border-cs-cream/40 px-4 py-2 mb-6">
          <span className="font-display font-light text-xs tracking-[0.3em] text-cs-cream/70 uppercase">
            Barrio El Hoyón · Costa Rica
          </span>
        </div>

        <h1 className="font-display font-medium text-4xl md:text-6xl text-cs-cream tracking-tight mb-3">
          Cocoa Sushi
        </h1>
        <p className="text-cs-khaki text-lg md:text-xl font-light mb-2">
          Fusión japonesa premium
        </p>
        <div className="w-12 h-px bg-cs-olive mx-auto mb-10" />

        <p className="text-cs-cream/70 text-base max-w-md mb-10 leading-relaxed">
          Viví una experiencia culinaria única. Reservá tu mesa y asegurá tu lugar
          en Cocoa Sushi.
        </p>

        <Link href="/reservar" className="btn-primary text-base px-10 py-4 rounded-2xl tracking-wide">
          Reservar mi mesa
        </Link>

        <div className="mt-4">
          <Link href="/gestionar" className="text-cs-cream/50 text-sm hover:text-cs-cream/80 underline underline-offset-4 transition-colors">
            Gestionar mi reservación
          </Link>
        </div>
      </section>

      {/* Info rápida */}
      <section className="border-t border-cs-cream/10 px-4 py-10">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <Clock className="h-5 w-5 text-cs-olive mx-auto mb-2" />
            <p className="text-cs-cream/80 text-sm font-medium">Horario</p>
            <p className="text-cs-cream/50 text-xs mt-1">Miér – Dom · 12:00–22:00</p>
          </div>
          <div>
            <MapPin className="h-5 w-5 text-cs-olive mx-auto mb-2" />
            <p className="text-cs-cream/80 text-sm font-medium">Ubicación</p>
            <p className="text-cs-cream/50 text-xs mt-1">Barrio El Hoyón, San Isidro</p>
          </div>
          <div>
            <Phone className="h-5 w-5 text-cs-olive mx-auto mb-2" />
            <p className="text-cs-cream/80 text-sm font-medium">WhatsApp</p>
            <p className="text-cs-cream/50 text-xs mt-1">+506 8888-0000</p>
          </div>
        </div>
      </section>
    </main>
  )
}
