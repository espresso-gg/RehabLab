import { getSupabaseClient } from './supabaseClient.js'
import { getSavedTime, isValidDateKey, sanitizeLog } from './logValidation.js'

const PAGE_SIZE = 1000
const UPSERT_BATCH_SIZE = 200

const fetchRemoteLogs = async (supabase) => {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('log_date, log_data, client_updated_at')
      .order('log_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

const upsertInBatches = async (supabase, rows) => {
  for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + UPSERT_BATCH_SIZE)
    const { error } = await supabase
      .from('daily_logs')
      .upsert(batch, { onConflict: 'user_id,log_date' })
    if (error) throw error
  }
}

export const buildSyncPlan = (localLogs, remoteRows, userId, now = new Date()) => {
  const remoteByDate = new Map(remoteRows.map((row) => [row.log_date, row]))
  const mergedLogs = { ...localLogs }
  let downloaded = 0

  remoteRows.forEach((row) => {
    const remoteLog = sanitizeLog(row.log_data, row.log_date)
    if (!remoteLog) return
    const localLog = localLogs[row.log_date]
    const remoteTime = getSavedTime(remoteLog, row.client_updated_at)
    const localTime = getSavedTime(localLog)
    if (!localLog || remoteTime > localTime) {
      mergedLogs[row.log_date] = {
        ...remoteLog,
        savedAt: remoteLog.savedAt || row.client_updated_at,
      }
      downloaded += 1
    }
  })

  const uploads = Object.entries(localLogs).flatMap(([date, log]) => {
    if (!isValidDateKey(date)) return []
    const cleanLog = sanitizeLog(log, date)
    if (!cleanLog) return []
    const remoteRow = remoteByDate.get(date)
    const localTime = getSavedTime(cleanLog)
    const remoteTime = remoteRow ? getSavedTime(remoteRow.log_data, remoteRow.client_updated_at) : -1
    if (remoteRow && localTime <= remoteTime) return []

    const clientUpdatedAt = localTime > 0 ? new Date(localTime).toISOString() : now.toISOString()
    return [{
      user_id: userId,
      log_date: date,
      log_data: { ...cleanLog, savedAt: cleanLog.savedAt || clientUpdatedAt },
      client_updated_at: clientUpdatedAt,
    }]
  })

  return {
    logs: mergedLogs,
    uploads,
    downloaded,
  }
}

export const syncRecoveryLogs = async (localLogs, userId) => {
  const supabase = await getSupabaseClient()
  if (!supabase || !userId) throw new Error('Cloud sync is not configured.')

  const remoteRows = await fetchRemoteLogs(supabase)
  const plan = buildSyncPlan(localLogs, remoteRows, userId)
  if (plan.uploads.length) await upsertInBatches(supabase, plan.uploads)

  return {
    logs: plan.logs,
    uploaded: plan.uploads.length,
    downloaded: plan.downloaded,
  }
}
