import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Init check — these must be non-empty for Supabase to work ─────────────────
console.log('[Vowed] Supabase URL:', supabaseUrl  ? `✓ ${supabaseUrl}`  : '✗ MISSING — check .env')
console.log('[Vowed] Supabase Key:', supabaseKey  ? '✓ set'             : '✗ MISSING — check .env')

export const supabase = createClient(supabaseUrl, supabaseKey)
