import { createClient } from '@supabase/supabase-js'

// Uses public client-side keys (NEXT_PUBLIC_*) for browser auth + data access.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
