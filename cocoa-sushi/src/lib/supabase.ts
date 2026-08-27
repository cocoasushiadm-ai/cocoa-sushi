import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseSR   = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público — usado en el frontend
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Cliente de servicio — usado solo en API routes (server-side)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, supabaseSR, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
