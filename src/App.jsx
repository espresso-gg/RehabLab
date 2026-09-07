import { useEffect, useState } from 'react'
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

const getDateRange = (days) => {
  const range = []
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(date)
    day.setDate(date.getDate() - offset)
    range.push(getLocalDateKey(day))
  }
  return range
}

const average = (values) => values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—'

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

const ProgressScreen = ({ logs }) => {
  const [range, setRange] = useState(7)
  const [selectedDate, setSelectedDate] = useState(null)
  const dateKeys = getDateRange(range)
  const entries = dateKeys.map((date) => logs[date] || null)
  const loggedEntries = entries.filter(Boolean)
  const painValues = loggedEntries.map((log) => log.worstPain).filter((value) => typeof value === 'number')
  const activityMinutes = loggedEntries.reduce((total, log) => total + (log.activities || []).reduce((sum, activity) => sum + (activity.duration || 0), 0), 0)
  const goodSleep = loggedEntries.filter((log) => log.sleep === 'good').length
  const selectedLog = selectedDate ? logs[selectedDate] : null

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

      <div className="metric-grid">
        <section className="progress-card flame-wrap metric-card"><span className="metric-icon">◷</span><strong>{activityMinutes}<small> min</small></strong><span>activity</span></section>
        <section className="progress-card flame-wrap metric-card"><span className="metric-icon">☼</span><strong>{goodSleep}<small> / {loggedEntries.length || 0}</small></strong><span>good sleep</span></section>
      </div>

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
      {screen === 'progress' ? <ProgressScreen logs={logs} /> : screen === 'history' ? <HistoryScreen logs={logs} /> : <>
      <header className="header">
        <p className="header-eyebrow">DAILY CHECK-IN</p>
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
