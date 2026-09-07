import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSyncPlan } from '../src/lib/cloudSync.js'

const makeLog = (date, savedAt, worstPain) => ({
  date,
  morningPain: worstPain,
  worstPain,
  legSymptoms: 'same',
  weakness: 'none',
  activities: [],
  sleep: 'okay',
  sleepingPosition: null,
  notes: '',
  savedAt,
})

test('sync plan uploads newer local data and downloads newer cloud data', () => {
  const localLogs = {
    '2026-09-05': makeLog('2026-09-05', '2026-09-05T12:00:00Z', 3),
    '2026-09-06': makeLog('2026-09-06', '2026-09-06T08:00:00Z', 7),
  }
  const remoteRows = [
    {
      log_date: '2026-09-05',
      log_data: makeLog('2026-09-05', '2026-09-05T10:00:00Z', 6),
      client_updated_at: '2026-09-05T10:00:00Z',
    },
    {
      log_date: '2026-09-06',
      log_data: makeLog('2026-09-06', '2026-09-06T14:00:00Z', 2),
      client_updated_at: '2026-09-06T14:00:00Z',
    },
  ]

  const plan = buildSyncPlan(localLogs, remoteRows, 'user-1')
  assert.equal(plan.uploads.length, 1)
  assert.equal(plan.uploads[0].log_date, '2026-09-05')
  assert.equal(plan.downloaded, 1)
  assert.equal(plan.logs['2026-09-06'].worstPain, 2)
})

test('sync plan never uploads malformed date keys', () => {
  const localLogs = {
    ['__proto__']: makeLog('__proto__', '2026-09-07T12:00:00Z', 3),
    '2026-02-30': makeLog('2026-02-30', '2026-09-07T12:00:00Z', 3),
  }
  const plan = buildSyncPlan(localLogs, [], 'user-1')
  assert.equal(plan.uploads.length, 0)
})
