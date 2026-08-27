
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Llamar desde cron job (Vercel Cron) cada minuto
// Vercel cron: vercel.json -> { "crons": [{ "path": "/api/admin/release", "schedule": "* * * * *" }] }
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = createServiceClient()
  const { data, error } = await sb.rpc('auto_release_tables')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ released: data })
}

// También llamar manualmente desde el panel admin
export async function POST(_: NextRequest) {
  const sb = createServiceClient()
  const { data } = await sb.rpc('auto_release_tables')
  return NextResponse.json({ released: data })
}
