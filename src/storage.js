import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudSyncEnabled = Boolean(supabaseUrl && supabaseAnonKey)
const supabase = cloudSyncEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null

const getSession = async () => {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}

export const loadCloudLogs = async () => {
  const session = await getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, log')
    .eq('user_id', session.user.id)
    .order('date', { ascending: true })

  if (error) throw error
  return Object.fromEntries(data.map((row) => [row.date, row.log]))
}

export const saveCloudLog = async (log) => {
  const session = await getSession()
  if (!session) return

  const { error } = await supabase.from('daily_logs').upsert({
    user_id: session.user.id,
    date: log.date,
    log,
    saved_at: log.savedAt,
  }, { onConflict: 'user_id,date' })

  if (error) throw error
}
