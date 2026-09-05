import { useState, useEffect } from 'react'
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

const getTodayKey = () => new Date().toISOString().split('T')[0]

const getDefaultLog = () => ({
  date: getTodayKey(),
  morningPain: null,
  worstPain: null,
  legSymptoms: null,
  weakness: null,
  activities: [],
  sleep: null,
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

const ActivitySheet = ({ isOpen, onClose, onAdd, suggestedActivity }) => {
  const [selectedType, setSelectedType] = useState(suggestedActivity?.type || 'walking')
  const [duration, setDuration] = useState(suggestedActivity?.duration || 20)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Add Activity</h2>
        
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
            onAdd({ type: selectedType, icon: type.icon, label: type.label, duration })
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

function App() {
  const [logs, setLogs] = useState({})
  const [currentLog, setCurrentLog] = useState(null)
  const [showActivitySheet, setShowActivitySheet] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  useEffect(() => {
    const loadedLogs = loadLogs()
    setLogs(loadedLogs)

    const todayKey = getTodayKey()
    const existingLog = loadedLogs[todayKey]
    
    if (existingLog) {
      setCurrentLog({ ...existingLog })
    } else {
      const draft = loadDraft()
      if (draft && draft.date === todayKey) {
        setCurrentLog({ ...getDefaultLog(), ...draft })
      } else {
        const defaultLog = getDefaultLog()
        const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const yesterdayLog = loadedLogs[yesterdayKey]
        
        if (yesterdayLog?.activities?.length > 0) {
          defaultLog.activities = [...yesterdayLog.activities]
        }
        
        setCurrentLog(defaultLog)
      }
    }
  }, [])

  useEffect(() => {
    if (currentLog && !currentLog.savedAt) {
      saveDraft(currentLog)
    }
  }, [currentLog])

  const updateField = (field, value) => {
    setCurrentLog((prev) => ({ ...prev, [field]: value }))
  }

  const addActivity = (activity) => {
    setCurrentLog((prev) => ({
      ...prev,
      activities: [...prev.activities, { ...activity, id: Date.now() }],
    }))
  }

  const removeActivity = (id) => {
    setCurrentLog((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }))
  }

  const handleSave = () => {
    const todayKey = getTodayKey()
    const savedLog = {
      ...currentLog,
      date: todayKey,
      savedAt: new Date().toISOString(),
    }
    
    const updatedLogs = { ...logs, [todayKey]: savedLog }
    setLogs(updatedLogs)
    saveLogs(updatedLogs)
    clearDraft()
    
    setCurrentLog(savedLog)
    setSaved(true)
    
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

  return (
    <div className="app">
      <header className="header">
        <h1>TODAY</h1>
        <p className="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </header>

      {saved && (
        <div className="save-confirmation">
          ✓ Logged — Today's recovery has been recorded.
        </div>
      )}

      <main className="today-screen">
        <PainSelector
          label="Morning Pain"
          value={currentLog.morningPain}
          onChange={(v) => updateField('morningPain', v)}
        />

        <PainSelector
          label="Worst Pain"
          value={currentLog.worstPain}
          onChange={(v) => updateField('worstPain', v)}
        />

        <div className="field">
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
        </div>

        <div className="field">
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
        </div>

        <div className="field">
          <label className="field-label">Activity</label>
          {currentLog.activities.length > 0 && (
            <div className="activity-list">
              {currentLog.activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <span>{activity.icon} {activity.label} · {activity.duration} min</span>
                  <button
                    className="remove-activity-btn"
                    onClick={() => removeActivity(activity.id)}
                    type="button"
                    aria-label="Remove activity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            className="add-activity-trigger"
            onClick={() => setShowActivitySheet(true)}
            type="button"
          >
            + Add activity
          </button>
        </div>

        <div className="field">
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
        </div>

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
              <label className="field-label">Notes</label>
              <textarea
                className="notes-input"
                placeholder="Any additional notes..."
                rows={3}
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
      />
    </div>
  )
}

export default App
