import { useEffect, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'rehablab_logs'
const DRAFT_KEY = 'rehablab_draft'

const ACTIVITY_TYPES = [
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'physio', label: 'Physio', icon: '🧘' },
  { id: 'exercise', label: 'Exercise', icon: '🏋️' },
  { id: 'gym', label: 'Gym', icon: '💪' },
  { id: 'other', label: 'Other', icon: '⚡' },
]

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTodayKey = () => getLocalDateKey()

const getYesterdayKey = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return getLocalDateKey(yesterday)
}

const getDateFromKey = (dateKey) => new Date(`${dateKey}T12:00:00`)

const capitalize = (value) => value
  ? value.charAt(0).toUpperCase() + value.slice(1)
  : 'Not recorded'

const getActivityId = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
)

const getDefaultLog = () => ({
  date: getTodayKey(),
  morningPain: null,
  worstPain: null,
  legSymptoms: null,
  weakness: null,
  activities: [],
  sleep: null,
  sleepingPosition: null,
  notes: '',
  savedAt: null,
})

const loadLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

const saveLogs = (logs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
}

const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY))
  } catch {
    return null
  }
}

const saveDraft = (draft) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
}

const SegmentedControl = ({ options, value, onChange, ariaLabel }) => (
  <div className="segmented-control" role="group" aria-label={ariaLabel}>
    {options.map((opt) => (
      <button
        key={opt.value}
        className={`segmented-option ${value === opt.value ? 'selected' : ''}`}
        onClick={() => onChange(opt.value)}
        type="button"
      >
        {opt.label}
      </button>
    ))}
  </div>
)

const PainSelector = ({ value, onChange, label }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    <div className="pain-selector">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          className={`pain-btn ${value === i ? 'selected' : ''}`}
          onClick={() => onChange(i)}
          type="button"
          aria-label={`Pain level ${i}`}
          aria-pressed={value === i}
        >
          {i}
        </button>
      ))}
    </div>
  </div>
)

const ActivitySheet = ({ isOpen, onClose, onAdd, suggestedActivity, editingActivity }) => {
  const [selectedType, setSelectedType] = useState('walking')
  const [duration, setDuration] = useState(20)

  useEffect(() => {
    if (isOpen) {
      setSelectedType(editingActivity?.type || suggestedActivity?.type || 'walking')
      setDuration(editingActivity?.duration || suggestedActivity?.duration || 20)
    }
  }, [isOpen, editingActivity, suggestedActivity])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-sheet-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="activity-sheet-title">{editingActivity ? 'Edit activity' : 'Add activity'}</h2>
        
        <div className="field">
          <label className="field-label">What did you do?</label>
          <div className="activity-types">
            {ACTIVITY_TYPES.map((type) => (
              <button
                key={type.id}
                className={`activity-type-btn ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
                type="button"
              >
                <span className="activity-icon">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Duration</label>
          <div className="duration-control">
            <button
              className="duration-btn"
              onClick={() => setDuration(Math.max(5, duration - 5))}
              type="button"
              aria-label="Decrease duration"
            >
              −
            </button>
            <span className="duration-value">{duration} min</span>
            <button
              className="duration-btn"
              onClick={() => setDuration(Math.min(180, duration + 5))}
              type="button"
              aria-label="Increase duration"
            >
              +
            </button>
          </div>
        </div>

        <button
          className="add-activity-btn"
          onClick={() => {
            const type = ACTIVITY_TYPES.find(t => t.id === selectedType)
            onAdd({ ...editingActivity, type: selectedType, icon: type.icon, label: type.label, duration })
            onClose()
          }}
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  )
}

const formatLogDate = (dateKey, options = { weekday: 'short', month: 'short', day: 'numeric' }) => (
  new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', options)
)

const getDateRange = (days, endOffset = 0) => {
  const range = []
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  for (let offset = days - 1 + endOffset; offset >= endOffset; offset -= 1) {
    const day = new Date(date)
    day.setDate(date.getDate() - offset)
    range.push(getLocalDateKey(day))
  }
  return range
}

const averageValue = (values) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : null

const average = (values) => {
  const value = averageValue(values)
  return value === null ? '—' : value.toFixed(1)
}

const getLoggingStreak = (logs) => {
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  if (!logs[getLocalDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (logs[getLocalDateKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

const TrendChart = ({ entries }) => {
  const values = entries.map((log) => log?.worstPain ?? null)
  const plotted = values
    .map((value, index) => value === null ? null : { value, index })
    .filter(Boolean)
  const points = plotted.map(({ value, index }) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - (value / 10) * 82 - 9}`).join(' ')

  return (
    <div className="trend-chart" aria-label="Worst pain trend chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        {[18, 43, 68, 93].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-grid-line" />)}
        {plotted.length > 1 && <polyline points={points} className="chart-line" />}
        {plotted.map(({ value, index }) => (
          <circle key={`${index}-${value}`} cx={(index / Math.max(values.length - 1, 1)) * 100} cy={100 - (value / 10) * 82 - 9} r="2.4" className="chart-dot" />
        ))}
      </svg>
      {plotted.length === 0 && <p className="chart-empty">Save a few check-ins to see your trend.</p>}
      <div className="chart-axis"><span>Earlier</span><span>Today</span></div>
    </div>
  )
}

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isValidDateKey = (value) => (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && getLocalDateKey(getDateFromKey(value)) === value
)

const safeChoice = (value, choices) => choices.includes(value) ? value : null

const sanitizePain = (value) => (
  Number.isInteger(value) && value >= 0 && value <= 10 ? value : null
)

const sanitizeActivity = (activity) => {
  if (!isPlainObject(activity)) return null
  const duration = Number(activity.duration)
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) return null

  return {
    id: getActivityId(),
    type: typeof activity.type === 'string' ? activity.type.slice(0, 40) : 'other',
    icon: typeof activity.icon === 'string' ? activity.icon.slice(0, 12) : '•',
    label: typeof activity.label === 'string' && activity.label.trim() ? activity.label.trim().slice(0, 80) : 'Activity',
    duration: Math.round(duration),
  }
}

const sanitizeLog = (log, date) => {
  if (!isPlainObject(log)) return null
  const savedAtTime = typeof log.savedAt === 'string' ? Date.parse(log.savedAt) : Number.NaN

  return {
    date,
    morningPain: sanitizePain(log.morningPain),
    worstPain: sanitizePain(log.worstPain),
    legSymptoms: safeChoice(log.legSymptoms, ['none', 'better', 'same', 'worse']),
    weakness: safeChoice(log.weakness, ['none', 'same', 'worse']),
    activities: Array.isArray(log.activities) ? log.activities.map(sanitizeActivity).filter(Boolean).slice(0, 50) : [],
    sleep: safeChoice(log.sleep, ['good', 'okay', 'bad']),
    sleepingPosition: safeChoice(log.sleepingPosition, ['back', 'side', 'front', 'mixed']),
    notes: typeof log.notes === 'string' ? log.notes.slice(0, 10000) : '',
    savedAt: Number.isNaN(savedAtTime) ? null : new Date(savedAtTime).toISOString(),
  }
}

const getSavedTime = (log) => {
  const value = log?.savedAt ? Date.parse(log.savedAt) : Number.NaN
  return Number.isNaN(value) ? 0 : value
}

const downloadFile = (filename, contents, type) => {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

const DataTools = ({ logs, onRestoreLogs }) => {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)
  const savedCount = Object.keys(logs).length

  const exportBackup = () => {
    const backup = {
      app: 'RehabLab',
      version: 1,
      exportedAt: new Date().toISOString(),
      logs,
    }
    downloadFile(`rehablab-backup-${getTodayKey()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    setStatus({ type: 'success', text: `Backup downloaded with ${savedCount} ${savedCount === 1 ? 'day' : 'days'}.` })
  }

  const exportCsv = () => {
    const headings = ['Date', 'Morning pain', 'Worst pain', 'Leg symptoms', 'Weakness', 'Activities', 'Activity minutes', 'Sleep', 'Sleeping position', 'Notes', 'Saved at']
    const rows = Object.keys(logs).sort().map((date) => {
      const log = logs[date]
      const activities = (log.activities || []).map((activity) => `${activity.label} (${activity.duration} min)`).join('; ')
      const activityMinutes = (log.activities || []).reduce((total, activity) => total + (activity.duration || 0), 0)
      return [date, log.morningPain, log.worstPain, log.legSymptoms, log.weakness, activities, activityMinutes, log.sleep, log.sleepingPosition, log.notes, log.savedAt]
    })
    const csv = [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    downloadFile(`rehablab-records-${getTodayKey()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
    setStatus({ type: 'success', text: `CSV downloaded with ${savedCount} ${savedCount === 1 ? 'row' : 'rows'}.` })
  }

  const restoreBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('That backup is larger than the 5 MB safety limit.')
      const payload = JSON.parse(await file.text())
      const incomingLogs = payload?.app === 'RehabLab' && payload.version === 1 && isPlainObject(payload.logs) ? payload.logs : null
      if (!incomingLogs) throw new Error('This is not a valid RehabLab backup file.')

      const incomingEntries = Object.entries(incomingLogs)
      if (incomingEntries.length > 5000) throw new Error('This backup contains too many daily records.')

      const mergedLogs = { ...logs }
      let restored = 0
      let keptLocal = 0
      let skipped = 0

      incomingEntries.forEach(([date, rawLog]) => {
        if (!isValidDateKey(date)) {
          skipped += 1
          return
        }
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

      if (incomingEntries.length > 0 && restored === 0 && keptLocal === 0) {
        throw new Error('No valid daily records were found in this backup.')
      }

      onRestoreLogs(mergedLogs)
      const details = [
        `${restored} ${restored === 1 ? 'day' : 'days'} restored`,
        keptLocal ? `${keptLocal} newer local ${keptLocal === 1 ? 'day' : 'days'} kept` : null,
        skipped ? `${skipped} invalid skipped` : null,
      ].filter(Boolean).join(' · ')
      setStatus({ type: 'success', text: details || 'Your local records are already up to date.' })
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'The backup could not be restored.' })
    }
  }

  return (
    <section className="progress-card data-card" aria-labelledby="data-heading">
      <div className="data-heading-row">
        <div className="privacy-mark" aria-hidden="true">◇</div>
        <div>
          <p className="section-kicker">YOUR DATA</p>
          <h2 id="data-heading">Private by default</h2>
        </div>
        <span className="local-badge">On this device</span>
      </div>
      <p className="data-description">Your check-ins are stored only in this browser. Download a backup so your recovery history stays in your hands.</p>
      <div className="data-actions">
        <button type="button" className="data-action primary" onClick={exportBackup}><span aria-hidden="true">↓</span> Backup</button>
        <button type="button" className="data-action" onClick={exportCsv}><span aria-hidden="true">▤</span> CSV</button>
        <button type="button" className="data-action" onClick={() => fileInputRef.current?.click()}><span aria-hidden="true">↑</span> Restore</button>
      </div>
      <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restoreBackup} tabIndex={-1} />
      {status && <p className={`data-status ${status.type}`} role="status">{status.text}</p>}
    </section>
  )
}

const ProgressScreen = ({ logs, onRestoreLogs }) => {
  const [range, setRange] = useState(7)
  const [selectedDate, setSelectedDate] = useState(null)
  const dateKeys = getDateRange(range)
  const previousDateKeys = getDateRange(range, range)
  const entries = dateKeys.map((date) => logs[date] || null)
  const previousEntries = previousDateKeys.map((date) => logs[date] || null).filter(Boolean)
  const loggedEntries = entries.filter(Boolean)
  const painValues = loggedEntries.map((log) => log.worstPain).filter((value) => typeof value === 'number')
  const previousPainValues = previousEntries.map((log) => log.worstPain).filter((value) => typeof value === 'number')
  const currentPainAverage = averageValue(painValues)
  const previousPainAverage = averageValue(previousPainValues)
  const hasPainComparison = painValues.length >= 2 && previousPainValues.length >= 2
  const painDelta = hasPainComparison ? currentPainAverage - previousPainAverage : null
  const painDirection = painDelta === null || Math.abs(painDelta) < 0.3
    ? 'steady'
    : painDelta < 0 ? 'lower' : 'higher'
  const activityMinutes = loggedEntries.reduce((total, log) => total + (log.activities || []).reduce((sum, activity) => sum + (activity.duration || 0), 0), 0)
  const previousActivityMinutes = previousEntries.reduce((total, log) => total + (log.activities || []).reduce((sum, activity) => sum + (activity.duration || 0), 0), 0)
  const activityPerLoggedDay = loggedEntries.length ? activityMinutes / loggedEntries.length : null
  const previousActivityPerLoggedDay = previousEntries.length ? previousActivityMinutes / previousEntries.length : null
  const activityChange = activityPerLoggedDay !== null && previousActivityPerLoggedDay !== null
    ? activityPerLoggedDay - previousActivityPerLoggedDay
    : null
  const goodSleep = loggedEntries.filter((log) => log.sleep === 'good').length
  const streak = getLoggingStreak(logs)
  const missedDays = dateKeys.filter((date) => date < getTodayKey() && !logs[date]).length
  const coverage = Math.round((loggedEntries.length / range) * 100)
  const symptomEntries = loggedEntries.filter((log) => log.legSymptoms)
  const symptomTypes = [
    { value: 'better', label: 'Better' },
    { value: 'same', label: 'Same' },
    { value: 'worse', label: 'Worse' },
    { value: 'none', label: 'None' },
  ]
  const symptomCounts = symptomTypes.map((type) => ({
    ...type,
    count: symptomEntries.filter((log) => log.legSymptoms === type.value).length,
  }))
  const selectedLog = selectedDate ? logs[selectedDate] : null

  const painChangeCopy = painDirection === 'lower'
    ? `Your recorded average was ${Math.abs(painDelta).toFixed(1)} points lower than the previous ${range} days.`
    : painDirection === 'higher'
      ? `Your recorded average was ${Math.abs(painDelta).toFixed(1)} points higher than the previous ${range} days.`
      : `Your recorded average was about the same as the previous ${range} days.`

  return (
    <main className="progress-screen">
      <div className="progress-heading">
        <p className="header-eyebrow">YOUR PROGRESS</p>
        <h1>Patterns over time</h1>
        <p className="date">A simple look back at your check-ins.</p>
      </div>

      <div className="range-toggle" role="group" aria-label="History range">
        {[7, 30].map((days) => (
          <button key={days} type="button" className={range === days ? 'selected' : ''} onClick={() => setRange(days)}>{days} days</button>
        ))}
      </div>

      <section className="progress-card flame-wrap trend-card" aria-labelledby="trend-heading">
        <div className="card-heading">
          <div><p className="section-kicker">WORST PAIN</p><h2 id="trend-heading">Your pain trend</h2></div>
          <span className="metric-large">{average(painValues)}</span>
        </div>
        <p className="metric-caption">average · {loggedEntries.length} of {range} days logged</p>
        <TrendChart entries={entries} />
      </section>

      <section className={`progress-card comparison-card ${hasPainComparison ? painDirection : 'insufficient'}`} aria-labelledby="comparison-heading">
        <div className="comparison-mark" aria-hidden="true">
          {hasPainComparison ? painDirection === 'lower' ? '↓' : painDirection === 'higher' ? '↑' : '↔' : '···'}
        </div>
        <div className="comparison-copy">
          <p className="section-kicker">RECORDED CHANGE</p>
          <h2 id="comparison-heading">{hasPainComparison ? painDirection === 'steady' ? 'Holding steady' : `${capitalize(painDirection)} than before` : 'A pattern is taking shape'}</h2>
          <p>{hasPainComparison ? painChangeCopy : 'Log a pain score on at least two days in both periods to see a useful comparison.'}</p>
        </div>
        {hasPainComparison && (
          <div className="period-averages" aria-label="Current and previous pain averages">
            <span><small>Prior</small><strong>{previousPainAverage.toFixed(1)}</strong></span>
            <i aria-hidden="true">→</i>
            <span><small>Now</small><strong>{currentPainAverage.toFixed(1)}</strong></span>
          </div>
        )}
      </section>

      <section className="progress-card consistency-card" aria-labelledby="consistency-heading">
        <div className="card-heading">
          <div><p className="section-kicker">CONSISTENCY</p><h2 id="consistency-heading">Your logging rhythm</h2></div>
          <span className="coverage-badge">{coverage}%</span>
        </div>
        <div className="consistency-grid">
          <div><strong>{streak}<small> days</small></strong><span>current streak</span></div>
          <div><strong>{loggedEntries.length}<small> / {range}</small></strong><span>days logged</span></div>
          <div><strong>{missedDays}</strong><span>days missed</span></div>
        </div>
        <div className="coverage-track" aria-label={`${loggedEntries.length} of ${range} days logged`}>
          <span style={{ width: `${coverage}%` }} />
        </div>
      </section>

      <div className="metric-grid">
        <section className="progress-card flame-wrap metric-card">
          <span className="metric-icon">◷</span><strong>{activityMinutes}<small> min</small></strong><span>activity</span>
          <small className="metric-trend">{activityChange === null ? 'No prior comparison' : `${activityChange > 0 ? '+' : ''}${activityChange.toFixed(0)} min/logged day vs prior`}</small>
        </section>
        <section className="progress-card flame-wrap metric-card"><span className="metric-icon">☼</span><strong>{goodSleep}<small> / {loggedEntries.length || 0}</small></strong><span>good sleep</span></section>
      </div>

      <section className="progress-card symptoms-card" aria-labelledby="symptoms-heading">
        <div className="card-heading">
          <div><p className="section-kicker">LEG SYMPTOMS</p><h2 id="symptoms-heading">What you recorded</h2></div>
          <span className="scale-hint">{symptomEntries.length} days</span>
        </div>
        {symptomEntries.length === 0 ? (
          <p className="empty-state">Log leg symptoms to see how they are distributed.</p>
        ) : (
          <>
            <div className="symptom-bar" aria-label={`Leg symptom distribution across ${symptomEntries.length} recorded days`}>
              {symptomCounts.filter((type) => type.count > 0).map((type) => (
                <span key={type.value} className={type.value} style={{ width: `${(type.count / symptomEntries.length) * 100}%` }} title={`${type.label}: ${type.count}`} />
              ))}
            </div>
            <div className="symptom-legend">
              {symptomCounts.map((type) => (
                <div key={type.value}><i className={type.value} /><span>{type.label}</span><strong>{type.count}</strong></div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="progress-card recent-card" aria-labelledby="recent-heading">
        <div className="card-heading"><div><p className="section-kicker">CHECK-INS</p><h2 id="recent-heading">Recent logs</h2></div><span className="scale-hint">{loggedEntries.length} saved</span></div>
        {loggedEntries.length === 0 ? <p className="empty-state">Your saved check-ins will appear here.</p> : (
          <div className="recent-list">
            {[...loggedEntries].reverse().map((log) => (
              <button type="button" className={`recent-row ${selectedDate === log.date ? 'selected' : ''}`} key={log.date} onClick={() => setSelectedDate(log.date)}>
                <span className="recent-date">{formatLogDate(log.date)}</span>
                <span>{typeof log.worstPain === 'number' ? `Pain ${log.worstPain}/10` : 'No pain score'}</span>
                <span className="recent-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedLog && (
        <section className="progress-card log-detail" aria-label={`Details for ${selectedDate}`}>
          <p className="section-kicker">{formatLogDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <div className="detail-pills">
            <span>Morning {selectedLog.morningPain ?? '—'}</span><span>Worst {selectedLog.worstPain ?? '—'}</span>
            <span>{selectedLog.activities?.length || 0} activities</span><span>Sleep {selectedLog.sleep || '—'}</span>
          </div>
          {selectedLog.notes && <p className="detail-note">“{selectedLog.notes}”</p>}
        </section>
      )}

      <DataTools logs={logs} onRestoreLogs={onRestoreLogs} />
    </main>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HistoryScreen = ({ logs }) => {
  const savedDates = Object.keys(logs).sort()
  const latestDate = savedDates.at(-1) || getTodayKey()
  const [selectedDate, setSelectedDate] = useState(latestDate)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = getDateFromKey(latestDate)
    return new Date(date.getFullYear(), date.getMonth(), 1, 12)
  })

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const firstWeekday = new Date(year, month, 1, 12).getDay()
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate()
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const selectedLog = logs[selectedDate] || null
  const selectedActivities = selectedLog?.activities || []
  const selectedActivityMinutes = selectedActivities.reduce((sum, activity) => sum + (activity.duration || 0), 0)

  const changeMonth = (offset) => {
    setVisibleMonth(new Date(year, month + offset, 1, 12))
  }

  const showToday = () => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12))
    setSelectedDate(getTodayKey())
  }

  return (
    <main className="history-screen">
      <div className="history-heading">
        <p className="header-eyebrow">RECOVERY JOURNAL</p>
        <h1>Your daily history</h1>
        <p className="date">Choose a day to revisit your check-in.</p>
      </div>

      <section className="calendar-card" aria-label="Check-in calendar">
        <div className="calendar-toolbar">
          <button type="button" className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
          <div>
            <p className="calendar-month">{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <button type="button" className="today-link" onClick={showToday}>Jump to today</button>
          </div>
          <button type="button" className="month-arrow" onClick={() => changeMonth(1)} aria-label="Next month" disabled={isCurrentMonth}>›</button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid">
          {calendarCells.map((day, index) => {
            if (!day) return <span className="calendar-blank" key={`blank-${index}`} />
            const dateKey = getLocalDateKey(new Date(year, month, day, 12))
            const log = logs[dateKey]
            const isToday = dateKey === getTodayKey()
            const isSelected = dateKey === selectedDate
            const isFuture = dateKey > getTodayKey()
            return (
              <button
                type="button"
                key={dateKey}
                className={`calendar-day ${log ? 'has-log' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(dateKey)}
                disabled={isFuture}
                aria-label={`${formatLogDate(dateKey, { month: 'long', day: 'numeric', year: 'numeric' })}${log ? `, pain ${log.worstPain ?? 'not recorded'}` : ', no check-in'}`}
                aria-pressed={isSelected}
              >
                <span className="day-number">{day}</span>
                {log && <span className="day-score">{typeof log.worstPain === 'number' ? log.worstPain : '✓'}</span>}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend"><span><i /> Logged day</span><span>Badge = worst pain</span></div>
      </section>

      <section className={`history-detail-card ${selectedLog ? 'has-entry' : ''}`} aria-live="polite">
        <div className="history-detail-heading">
          <div>
            <p className="section-kicker">{selectedDate === getTodayKey() ? 'TODAY' : 'DAILY CHECK-IN'}</p>
            <h2>{formatLogDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          </div>
          {selectedLog && <span className="history-year">{getDateFromKey(selectedDate).getFullYear()}</span>}
        </div>

        {!selectedLog ? (
          <div className="history-empty">
            <span aria-hidden="true">○</span>
            <h3>No check-in saved</h3>
            <p>This day is still an open page in your recovery journal.</p>
          </div>
        ) : (
          <>
            <div className="pain-summary">
              <div><strong>{selectedLog.morningPain ?? '—'}</strong><span>Morning pain</span></div>
              <div className="pain-summary-primary"><strong>{selectedLog.worstPain ?? '—'}</strong><span>Worst pain</span></div>
              <span className="pain-scale">out of 10</span>
            </div>

            <div className="history-facts">
              <div><span>Leg symptoms</span><strong>{capitalize(selectedLog.legSymptoms)}</strong></div>
              <div><span>Weakness</span><strong>{capitalize(selectedLog.weakness)}</strong></div>
              <div><span>Sleep</span><strong>{capitalize(selectedLog.sleep)}</strong></div>
              <div><span>Sleep position</span><strong>{capitalize(selectedLog.sleepingPosition)}</strong></div>
            </div>

            <div className="history-section-heading">
              <div><p className="section-kicker">ACTIVITY</p><h3>{selectedActivities.length ? `${selectedActivityMinutes} minutes total` : 'No activity recorded'}</h3></div>
              {selectedActivities.length > 0 && <span>{selectedActivities.length} {selectedActivities.length === 1 ? 'entry' : 'entries'}</span>}
            </div>
            {selectedActivities.length > 0 && (
              <div className="history-activities">
                {selectedActivities.map((activity) => (
                  <div key={activity.id}>
                    <span className="history-activity-icon">{activity.icon}</span>
                    <strong>{activity.label}</strong>
                    <span>{activity.duration} min</span>
                  </div>
                ))}
              </div>
            )}

            {selectedLog.notes && (
              <div className="history-note">
                <p className="section-kicker">NOTE TO SELF</p>
                <p>“{selectedLog.notes}”</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function App() {
  const [logs, setLogs] = useState({})
  const [currentLog, setCurrentLog] = useState(null)
  const [showActivitySheet, setShowActivitySheet] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [screen, setScreen] = useState('today')
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    const loadedLogs = loadLogs()
    setLogs(loadedLogs)

    const todayKey = getTodayKey()
    const existingLog = loadedLogs[todayKey]
    const draft = loadDraft()
    const hasTodayDraft = draft && draft.date === todayKey
    
    if (hasTodayDraft) {
      setCurrentLog({ ...getDefaultLog(), ...draft })
      setShowMoreDetails(Boolean(draft.notes || draft.sleepingPosition))
      setIsDirty(true)
    } else if (existingLog) {
      setCurrentLog({ ...existingLog })
      setShowMoreDetails(Boolean(existingLog.notes || existingLog.sleepingPosition))
    } else {
      setCurrentLog(getDefaultLog())
    }
  }, [])

  useEffect(() => {
    if (currentLog && isDirty) {
      saveDraft({ ...currentLog, draftUpdatedAt: new Date().toISOString() })
    }
  }, [currentLog, isDirty])

  const updateField = (field, value) => {
    setIsDirty(true)
    setCurrentLog((prev) => ({ ...prev, [field]: value }))
  }

  const addActivity = (activity) => {
    setCurrentLog((prev) => ({
      ...prev,
      activities: editingActivity
        ? prev.activities.map((item) => item.id === editingActivity.id ? { ...item, ...activity } : item)
        : [...prev.activities, { ...activity, id: getActivityId() }],
    }))
    setIsDirty(true)
    setEditingActivity(null)
  }

  const removeActivity = (id) => {
    setIsDirty(true)
    setCurrentLog((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }))
  }

  const repeatYesterdayActivities = () => {
    const yesterdayActivities = logs[getYesterdayKey()]?.activities || []
    if (!yesterdayActivities.length) return

    setCurrentLog((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        ...yesterdayActivities.map((activity) => ({ ...activity, id: getActivityId() })),
      ],
    }))
    setIsDirty(true)
  }

  const handleSave = () => {
    const todayKey = getTodayKey()
    const { draftUpdatedAt: _draftUpdatedAt, ...logFields } = currentLog
    const savedLog = {
      ...logFields,
      date: todayKey,
      savedAt: new Date().toISOString(),
    }
    
    const updatedLogs = { ...logs, [todayKey]: savedLog }
    setLogs(updatedLogs)
    saveLogs(updatedLogs)
    clearDraft()
    
    setCurrentLog(savedLog)
    setSaved(true)
    setIsDirty(false)
    
    setTimeout(() => setSaved(false), 3000)
  }

  const handleRestoreLogs = (restoredLogs) => {
    saveLogs(restoredLogs)
    setLogs(restoredLogs)

    const restoredToday = restoredLogs[getTodayKey()]
    if (restoredToday && !isDirty) {
      setCurrentLog({ ...restoredToday })
      setShowMoreDetails(Boolean(restoredToday.notes || restoredToday.sleepingPosition))
    }
  }

  const handleInstallApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (!currentLog) {
    return <div className="loading">Loading...</div>
  }

  const getSuggestedActivity = () => {
    if (currentLog.activities.length > 0) {
      const last = currentLog.activities[currentLog.activities.length - 1]
      return { type: last.type, duration: last.duration }
    }
    return null
  }

  const yesterdayActivities = logs[getYesterdayKey()]?.activities || []
  const yesterdayMinutes = yesterdayActivities.reduce((total, activity) => total + (activity.duration || 0), 0)

  return (
    <div className="app">
      {screen === 'progress' ? <ProgressScreen logs={logs} onRestoreLogs={handleRestoreLogs} /> : screen === 'history' ? <HistoryScreen logs={logs} /> : <>
      <header className="header">
        <div className="header-topline">
          <p className="header-eyebrow">DAILY CHECK-IN</p>
          {installPrompt && (
            <button type="button" className="install-app-btn" onClick={handleInstallApp}>
              <span aria-hidden="true">↓</span> Install app
            </button>
          )}
        </div>
        <h1>How are you feeling?</h1>
        <p className="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} <span>·</span> takes less than a minute</p>
      </header>

      {saved && (
        <div className="save-confirmation">
          ✓ Logged — Today's recovery has been recorded.
        </div>
      )}

      <main className="today-screen">
        <section className="checkin-card pain-card" aria-labelledby="pain-heading">
          <div className="card-heading">
            <div>
              <p className="section-kicker">PAIN</p>
              <h2 id="pain-heading">How did it feel today?</h2>
            </div>
            <span className="scale-hint">0 — 10</span>
          </div>
          <div className="pain-grid">
            <PainSelector label="Morning" value={currentLog.morningPain} onChange={(v) => updateField('morningPain', v)} />
            <PainSelector label="Worst" value={currentLog.worstPain} onChange={(v) => updateField('worstPain', v)} />
          </div>
        </section>

        <section className="checkin-card field">
          <label className="field-label">Leg Symptoms</label>
          <SegmentedControl
            ariaLabel="Leg symptoms"
            options={[
              { value: 'none', label: 'None' },
              { value: 'better', label: 'Better' },
              { value: 'same', label: 'Same' },
              { value: 'worse', label: 'Worse' },
            ]}
            value={currentLog.legSymptoms}
            onChange={(v) => updateField('legSymptoms', v)}
          />
        </section>

        <section className="checkin-card field">
          <label className="field-label">Weakness</label>
          <SegmentedControl
            ariaLabel="Weakness"
            options={[
              { value: 'none', label: 'None' },
              { value: 'same', label: 'Same' },
              { value: 'worse', label: 'Worse' },
            ]}
            value={currentLog.weakness}
            onChange={(v) => updateField('weakness', v)}
          />
        </section>

        <section className="checkin-card field activity-card">
          <label className="field-label">Activity</label>
          {currentLog.activities.length === 0 && yesterdayActivities.length > 0 && (
            <button className="repeat-yesterday-btn" onClick={repeatYesterdayActivities} type="button">
              <span className="repeat-icon" aria-hidden="true">↻</span>
              <span>
                <strong>Repeat yesterday</strong>
                <small>{yesterdayActivities.length} {yesterdayActivities.length === 1 ? 'activity' : 'activities'} · {yesterdayMinutes} min</small>
              </span>
              <span className="repeat-add" aria-hidden="true">+</span>
            </button>
          )}
          {currentLog.activities.length > 0 && (
            <div className="activity-list">
              {currentLog.activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <span>{activity.icon} {activity.label} · {activity.duration} min</span>
                  <button
                    className="edit-activity-btn"
                    onClick={() => { setEditingActivity(activity); setShowActivitySheet(true) }}
                    type="button"
                    aria-label={`Edit ${activity.label}`}
                  >
                    Edit
                  </button>
                  <button className="remove-activity-btn" onClick={() => removeActivity(activity.id)} type="button" aria-label={`Remove ${activity.label}`}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button
            className="add-activity-trigger"
            onClick={() => { setEditingActivity(null); setShowActivitySheet(true) }}
            type="button"
          >
            + Add activity
          </button>
        </section>

        <section className="checkin-card field">
          <label className="field-label">Sleep</label>
          <SegmentedControl
            ariaLabel="Sleep quality"
            options={[
              { value: 'good', label: 'Good' },
              { value: 'okay', label: 'Okay' },
              { value: 'bad', label: 'Bad' },
            ]}
            value={currentLog.sleep}
            onChange={(v) => updateField('sleep', v)}
          />
        </section>

        {!showMoreDetails ? (
          <button
            className="more-details-btn"
            onClick={() => setShowMoreDetails(true)}
            type="button"
          >
            + More details
          </button>
        ) : (
          <div className="more-details">
            <div className="field">
              <label className="field-label">Sleeping position</label>
              <SegmentedControl
                ariaLabel="Sleeping position"
                options={[
                  { value: 'back', label: 'Back' },
                  { value: 'side', label: 'Side' },
                  { value: 'front', label: 'Front' },
                  { value: 'mixed', label: 'Mixed' },
                ]}
                value={currentLog.sleepingPosition}
                onChange={(v) => updateField('sleepingPosition', v)}
              />
            </div>
            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="notes-input"
                placeholder="Any additional notes..."
                rows={3}
                value={currentLog.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                aria-label="Additional notes"
              />
            </div>
          </div>
        )}

        <button className="save-btn" onClick={handleSave} type="button">
          {currentLog.savedAt ? 'Update Today' : 'Save Today'}
        </button>
      </main>

      <ActivitySheet
        isOpen={showActivitySheet}
        onClose={() => setShowActivitySheet(false)}
        onAdd={addActivity}
        suggestedActivity={getSuggestedActivity()}
        editingActivity={editingActivity}
      />
      </>}
      <nav className="bottom-nav" aria-label="Primary navigation">
        <button type="button" className={screen === 'today' ? 'active' : ''} onClick={() => setScreen('today')} aria-current={screen === 'today' ? 'page' : undefined}><span>＋</span>Today</button>
        <button type="button" className={screen === 'history' ? 'active' : ''} onClick={() => setScreen('history')} aria-current={screen === 'history' ? 'page' : undefined}><span>▦</span>History</button>
        <button type="button" className={screen === 'progress' ? 'active' : ''} onClick={() => setScreen('progress')} aria-current={screen === 'progress' ? 'page' : undefined}><span>⌁</span>Progress</button>
      </nav>
    </div>
  )
}

export default App
