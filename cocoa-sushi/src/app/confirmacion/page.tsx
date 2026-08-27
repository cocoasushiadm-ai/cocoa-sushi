"use client"
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const code = params.get('code')
  const wa = params.get('wa')

  return (
    <div className="min-h-screen bg-cs-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🍣</div>
        <h1 className="font-display text-3xl text-cs-khaki mb-2">¡Reservación Confirmada!</h1>
        <p className="text-white/50 mb-8">Te esperamos en Cocoa Sushi</p>

        <div className="card p-5 mb-6 text-left space-y-2">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Código de reserva</div>
          <div className="font-mono text-2xl text-cs-copper font-medium text-center">{code}</div>
          <p className="text-xs text-white/30 text-center mt-2">Guardá este código para gestionar tu reserva</p>
        </div>

        <div className="space-y-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="btn-primary w-full flex items-center justify-center gap-2 no-underline">
              <span>💬</span> Recibir confirmación por WhatsApp
            </a>
          )}
          <a href="/gestionar" className="btn-secondary w-full flex items-center justify-center">
            Gestionar mi reserva
          </a>
          <a href="/" className="btn-ghost w-full flex items-center justify-center text-white/40">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cs-dark flex items-center justify-center text-white/40">Cargando…</div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
