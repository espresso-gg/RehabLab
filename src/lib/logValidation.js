const getRecordId = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
)

export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const safeChoice = (value, choices) => choices.includes(value) ? value : null

const sanitizePain = (value) => (
  Number.isInteger(value) && value >= 0 && value <= 10 ? value : null
)

const sanitizeActivity = (activity) => {
  if (!isPlainObject(activity)) return null
  const duration = Number(activity.duration)
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) return null

  return {
    id: typeof activity.id === 'string' && activity.id ? activity.id.slice(0, 128) : getRecordId(),
    type: typeof activity.type === 'string' ? activity.type.slice(0, 40) : 'other',
    icon: typeof activity.icon === 'string' ? activity.icon.slice(0, 12) : '•',
    label: typeof activity.label === 'string' && activity.label.trim() ? activity.label.trim().slice(0, 80) : 'Activity',
    duration: Math.round(duration),
  }
}

export const sanitizeLog = (log, date) => {
  if (!isPlainObject(log) || !isValidDateKey(date)) return null
  const savedAtTime = typeof log.savedAt === 'string' ? Date.parse(log.savedAt) : Number.NaN
  const usedActivityIds = new Set()
  const activities = Array.isArray(log.activities)
    ? log.activities.map(sanitizeActivity).filter(Boolean).slice(0, 50).map((activity) => {
        const id = usedActivityIds.has(activity.id) ? getRecordId() : activity.id
        usedActivityIds.add(id)
        return { ...activity, id }
      })
    : []

  return {
    date,
    morningPain: sanitizePain(log.morningPain),
    worstPain: sanitizePain(log.worstPain),
    legSymptoms: safeChoice(log.legSymptoms, ['none', 'better', 'same', 'worse']),
    weakness: safeChoice(log.weakness, ['none', 'same', 'worse']),
    activities,
    sleep: safeChoice(log.sleep, ['good', 'okay', 'bad']),
    sleepingPosition: safeChoice(log.sleepingPosition, ['back', 'side', 'front', 'mixed']),
    notes: typeof log.notes === 'string' ? log.notes.slice(0, 10000) : '',
    savedAt: Number.isNaN(savedAtTime) ? null : new Date(savedAtTime).toISOString(),
  }
}

export const getSavedTime = (log, fallback) => {
  const value = log?.savedAt ? Date.parse(log.savedAt) : Date.parse(fallback || '')
  return Number.isNaN(value) ? 0 : value
}

export const mergeRecoveryLogs = (localLogs, incomingLogs) => {
  const mergedLogs = { ...localLogs }
  let restored = 0
  let keptLocal = 0
  let skipped = 0

  Object.entries(incomingLogs).forEach(([date, rawLog]) => {
    const incomingLog = sanitizeLog(rawLog, date)
    if (!incomingLog) {
      skipped += 1
      return
    }

    const localLog = mergedLogs[date]
    if (!localLog || getSavedTime(incomingLog) > getSavedTime(localLog)) {
      mergedLogs[date] = incomingLog
      restored += 1
    } else {
      keptLocal += 1
    }
  })

  return { logs: mergedLogs, restored, keptLocal, skipped }
}
