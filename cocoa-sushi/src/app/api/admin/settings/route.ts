
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb.from('restaurant_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  const { key, value } = body

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key y value requeridos' }, { status: 400 })
  }

  const { data, error } = await sb.from('restaurant_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ setting: data })
}
