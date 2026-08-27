"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Credenciales incorrectas')
    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-cs-dark flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl text-cs-khaki mb-1">Cocoa Sushi</div>
          <div className="text-xs text-white/30 tracking-widest uppercase">Panel Administrativo</div>
        </div>

        <form onSubmit={login} className="card p-6 space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Correo electrónico</label>
            <input type="email" className="input" placeholder="admin@cocoasushi.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Contraseña</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Entrando…' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center mt-4 text-xs text-white/20">
          ← <a href="/" className="hover:text-white/40">Volver al sitio</a>
        </p>
      </div>
    </div>
  )
}
