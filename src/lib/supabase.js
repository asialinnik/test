import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// The app still works fully offline/local-only if these env vars aren't set.
export const isSupabaseConfigured = () => Boolean(url && anonKey)

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // We use 6-digit email codes (no redirect), so URL detection is off.
        detectSessionInUrl: false,
      },
    })
  : null
