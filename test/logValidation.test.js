import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidDateKey, mergeRecoveryLogs, sanitizeLog } from '../src/lib/logValidation.js'

const makeLog = (date, savedAt, overrides = {}) => ({
  date,
  morningPain: 3,
  worstPain: 5,
  legSymptoms: 'better',
  weakness: 'none',
  activities: [],
  sleep: 'good',
  sleepingPosition: 'side',
  notes: '',
  savedAt,
  ...overrides,
})

test('validates real calendar date keys', () => {
  assert.equal(isValidDateKey('2026-09-07'), true)
  assert.equal(isValidDateKey('2026-02-30'), false)
  assert.equal(isValidDateKey('__proto__'), false)
})

test('sanitizes recovery fields and duplicate activity IDs', () => {
  const log = sanitizeLog(makeLog('2026-09-07', '2026-09-07T08:00:00Z', {
    worstPain: 99,
    notes: 42,
    activities: [
      { id: 'same-id', type: 'walking', icon: '🚶', label: ' Walk ', duration: 20 },
      { id: 'same-id', type: 'walking', icon: '🚶', label: 'Walk', duration: 10 },
      { id: 'invalid', label: 'Invalid', duration: -2 },
    ],
  }), '2026-09-07')

  assert.equal(log.worstPain, null)
  assert.equal(log.notes, '')
  assert.equal(log.activities.length, 2)
  assert.notEqual(log.activities[0].id, log.activities[1].id)
  assert.equal(log.activities[0].label, 'Walk')
})

test('backup merge adds missing days and keeps newer local records', () => {
  const local = {
    '2026-09-06': makeLog('2026-09-06', '2026-09-06T12:00:00Z', { worstPain: 4 }),
  }
  const incoming = {
    '2026-09-05': makeLog('2026-09-05', '2026-09-05T12:00:00Z'),
    '2026-09-06': makeLog('2026-09-06', '2026-09-06T10:00:00Z', { worstPain: 8 }),
    'not-a-date': {},
  }

  const result = mergeRecoveryLogs(local, incoming)
  assert.equal(result.restored, 1)
  assert.equal(result.keptLocal, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.logs['2026-09-06'].worstPain, 4)
  assert.equal(result.logs['2026-09-05'].worstPain, 5)
})
