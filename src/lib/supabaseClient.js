const env = import.meta.env || {}
const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let clientPromise = null

export const getSupabaseClient = async () => {
  if (!isSupabaseConfigured) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => (
      createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'rehablab-auth',
        },
      })
    ))
  }
  return clientPromise
}
