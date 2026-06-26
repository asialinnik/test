import { supabase } from './supabase'

const TABLE = 'app_data'

// Fetch the user's stored blob. Returns null ONLY when the read succeeded and
// there is genuinely no cloud row yet. THROWS on any failure (network, auth,
// RLS, timeout) so callers never mistake "couldn't read" for "cloud is empty"
// and overwrite good cloud data with an empty local state.
export async function pullRemote(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('Sync pull failed:', error.message)
    throw new Error(error.message)
  }
  return data?.data ?? null
}

// Upsert the user's blob (one row per user).
export async function pushRemote(userId, blob) {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, data: blob, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) console.error('Sync push failed:', error.message)
}
