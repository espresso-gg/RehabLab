import { useCallback, useEffect, useRef, useState } from 'react'
import { syncRecoveryLogs } from '../lib/cloudSync.js'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient.js'

const CLOUD_OWNER_KEY = 'rehablab_cloud_owner'

export const useCloudSync = ({ logs, ready, onMerge }) => {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [syncState, setSyncState] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const logsRef = useRef(logs)
  const mergeRef = useRef(onMerge)
  const sessionRef = useRef(null)
  const syncPromiseRef = useRef(null)

  useEffect(() => { logsRef.current = logs }, [logs])
  useEffect(() => { mergeRef.current = onMerge }, [onMerge])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    let subscription = null

    getSupabaseClient().then(async (client) => {
      if (!active || !client) return
      const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
        sessionRef.current = nextSession
        setSession(nextSession)
        setAuthLoading(false)
        if (!nextSession) {
          setSyncState('idle')
          setLastSyncedAt(null)
        }
      })
      subscription = authListener.subscription

      const { data, error } = await client.auth.getSession()
      if (!active) return
      if (error) setNotice({ type: 'error', text: error.message })
      sessionRef.current = data.session
      setSession(data.session)
      setAuthLoading(false)
    }).catch((error) => {
      if (!active) return
      setAuthLoading(false)
      setNotice({ type: 'error', text: error.message })
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const syncNow = useCallback(async ({ announce = true } = {}) => {
    const user = sessionRef.current?.user
    if (!isSupabaseConfigured || !user || !ready) return null
    if (syncPromiseRef.current) return syncPromiseRef.current

    const linkedOwner = localStorage.getItem(CLOUD_OWNER_KEY)
    if (linkedOwner && linkedOwner !== user.id) {
      const message = 'These local records are linked to another account. Back them up and clear this site before switching accounts.'
      setSyncState('error')
      setNotice({ type: 'error', text: message })
      return null
    }
    if (!linkedOwner) localStorage.setItem(CLOUD_OWNER_KEY, user.id)

    setSyncState('syncing')
    if (announce) setNotice({ type: 'info', text: 'Syncing your recovery records…' })

    const operation = syncRecoveryLogs(logsRef.current, user.id)
      .then((result) => {
        if (JSON.stringify(result.logs) !== JSON.stringify(logsRef.current)) {
          mergeRef.current(result.logs)
        }
        const syncedAt = new Date()
        setLastSyncedAt(syncedAt)
        setSyncState('synced')
        if (announce || result.uploaded || result.downloaded) {
          setNotice({
            type: 'success',
            text: result.uploaded || result.downloaded
              ? `${result.uploaded} uploaded · ${result.downloaded} downloaded`
              : 'Everything is up to date.',
          })
        }
        return result
      })
      .catch((error) => {
        setSyncState('error')
        setNotice({ type: 'error', text: navigator.onLine ? error.message : 'You are offline. Local changes will sync when you reconnect.' })
        return null
      })
      .finally(() => { syncPromiseRef.current = null })

    syncPromiseRef.current = operation
    return operation
  }, [ready])

  useEffect(() => {
    if (!ready || !session?.user) return undefined
    const timer = setTimeout(() => syncNow({ announce: false }), 700)
    return () => clearTimeout(timer)
  }, [logs, ready, session?.user?.id, syncNow])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    const handleOnline = () => syncNow({ announce: false })
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncNow])

  const sendMagicLink = async (email) => {
    const supabase = await getSupabaseClient()
    if (!supabase) return
    setNotice({ type: 'info', text: 'Sending a secure sign-in link…' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setNotice(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: `Check ${email} for your sign-in link.` })
  }

  const signOut = async () => {
    const supabase = await getSupabaseClient()
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    setNotice(error
      ? { type: 'error', text: error.message }
      : { type: 'info', text: 'Signed out. Your records remain on this device.' })
  }

  return {
    configured: isSupabaseConfigured,
    session,
    authLoading,
    syncState,
    notice,
    lastSyncedAt,
    sendMagicLink,
    signOut,
    syncNow: () => syncNow({ announce: true }),
  }
}
