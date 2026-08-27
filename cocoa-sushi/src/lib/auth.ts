import { supabaseAdmin } from './supabase'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getAdminUser() {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  const { data: admin } = await supabaseAdmin()
    .from('admin_users')
    .select('*')
    .eq('auth_id', user.id)
    .eq('active', true)
    .single()

  return admin ?? null
}

export async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new Error('Unauthorized')
  return admin
}
