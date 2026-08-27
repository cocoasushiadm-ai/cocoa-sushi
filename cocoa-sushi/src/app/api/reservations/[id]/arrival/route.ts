import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin()
  const { data } = await db.rpc('mark_arrival', {
    p_reservation_id: params.id,
    p_admin_id: null,
  })
  if (!data?.success) return NextResponse.json({ error: data?.error }, { status: 400 })
  return NextResponse.json(data)
}
