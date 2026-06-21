import { supabase } from './supabase'

const TABLE = 'app_data'

// Fetch the user's stored blob, or null if none / on error.
export async function pullRemote(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('Sync pull failed:', error.message)
    return null
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
