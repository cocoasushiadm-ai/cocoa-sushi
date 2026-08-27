"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/admin/dashboard',     icon: '📊', label: 'Dashboard' },
  { href: '/admin/reservas',      icon: '📋', label: 'Reservas' },
  { href: '/admin/mapa',          icon: '🗺️',  label: 'Mapa de mesas' },
  { href: '/admin/mesas',         icon: '🍣',  label: 'Configurar mesas' },
  { href: '/admin/configuracion', icon: '⚙️',  label: 'Configuración' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const nav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 border-b border-white/10">
        <div className="font-display text-lg text-cs-khaki">Cocoa Sushi</div>
        <div className="text-xs text-white/30 tracking-widest uppercase">Administración</div>
      </div>
      <div className="flex-1 p-3 space-y-1">
        {NAV.map(n => (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
              pathname.startsWith(n.href) ? 'bg-cs-forest text-cs-cream' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}>
            <span>{n.icon}</span><span>{n.label}</span>
          </Link>
        ))}
      </div>
      <div className="p-3 border-t border-white/10">
        <a href="/" target="_blank" className="flex items-center gap-3 px-3 py-2 rounded text-xs text-white/30 hover:text-white/50 mb-1">
          <span>🔗</span><span>Ver sitio público</span>
        </a>
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded text-xs text-white/30 hover:text-red-400 w-full">
          <span>🚪</span><span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setOpen(o => !o)}
        className="md:hidden fixed top-3 left-3 z-50 bg-cs-forest p-2 rounded text-cs-cream">
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-cs-dark border-r border-white/10 z-40 transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {nav}
      </aside>
    </>
  )
}
