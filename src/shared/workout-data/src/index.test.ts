import { describe, expect, it } from 'vitest'
import {
  loadSampleWorkoutSessions,
  loadWorkoutSessionsFromFiles,
  parseMachineMaster,
  parseGymMaster,
  parseWorkoutJson,
  parseWorkoutJsonl,
  sampleMasterData,
} from './index'

describe('workout-data', () => {
  it('loads sample JSON and JSONL into unified WorkoutSession array', () => {
    const sessions = loadSampleWorkoutSessions()

    expect(sessions).toHaveLength(3)
    expect(sessions.map((session) => session.session_id)).toEqual([
      '2026-08-14-01',
      '2026-08-16-01',
      '2026-08-18-01',
    ])
  })

  it('parses a single JSON workout', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions[0].date).toBe('2026-08-22')
    expect(result.sessions[0].gym.name).toBe('エニタイムフィットネス 横須賀汐入店')
    expect(result.sessions[0].machines[0]).toMatchObject({
      machine_id: 'abdominal',
      name: 'アブドミナル',
      body_part: 'core',
    })
  })

  it('parses JSONL as one session per line', () => {
    const result = parseWorkoutJsonl(
      'workouts/2026/08/2026-08-22.jsonl',
      [
        '{"schema_version":1,"session_id":"2026-08-22-01","date":"2026-08-22","status":"complete","gym_id":"af-shioiri","machines":[{"machine_id":"abdominal","sets":[{"set":1,"weight_kg":40,"reps":12}]}]}',
        '{"schema_version":1,"session_id":"2026-08-22-02","date":"2026-08-22","status":"complete","gym_id":"af-akihabara","machines":[{"machine_id":"lat-pulldown","sets":[{"set":1,"weight_kg":50,"reps":10}]}]}',
      ].join('\n'),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions.map((session) => session.session_id)).toEqual([
      '2026-08-22-01',
      '2026-08-22-02',
    ])
  })

  it('accepts explicit partial status without guessing required fields', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-14.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-14-01',
        date: '2026-08-14',
        status: 'partial',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'hip-abduction',
            sets: [{ set: 1, weight_kg: 65, reps: 10 }],
          },
        ],
      }),
    )

    expect(result.sessions[0].status).toBe('partial')
    expect(result.sessions[0].gym.name).toBe('エニタイムフィットネス 横須賀汐入店')
    expect(result.sessions[0].machines[0].machine_id).toBe('hip-abduction')
    expect(result.issues).toEqual([])
  })

  it('rejects missing or invalid status instead of defaulting to partial', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-14.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-14-01',
        date: '2026-08-14',
        status: 'partial_log',
        gym_id: 'af-shioiri',
        machines: [],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.some((issue) => issue.message.includes('status'))).toBe(true)
  })

  it('rejects sessions with missing required session fields instead of generating defaults', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-14.json',
      JSON.stringify({
        date: '2026-08-14',
        status: 'complete',
        gym_id: 'unknown-gym',
        machines: [
          {
            machine_id: 'hip-abduction',
            sets: [{ set: 1, weight_kg: 65, reps: 10 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Missing required numeric field: schema_version.',
        'Missing required string field: session_id.',
      ]),
    )
  })

  it('does not auto-generate session_id from date', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.some((issue) => issue.message.includes('session_id'))).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026/08/22',
        status: 'complete',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.some((issue) => issue.message.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('rejects machines with missing machine_id instead of generating placeholders', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        machines: [
          {
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Machine at index 0 is missing machine_id.',
      ]),
    )
  })

  it('keeps workouts with unknown machine_id references as runtime warnings', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'unknown-machine',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].machines[0]).toMatchObject({
      machine_id: 'unknown-machine',
      resolution: {
        state: 'missing',
        originalId: 'unknown-machine',
        resolvedId: null,
      },
    })
    expect(result.sessions[0].machines[0]).not.toHaveProperty('name')
    expect(result.sessions[0].machines[0]).not.toHaveProperty('body_part')
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'MASTER_REFERENCE_MISSING',
        referenceKind: 'machine',
        resolutionState: 'missing',
        originalId: 'unknown-machine',
        resolvedId: null,
        sessionId: '2026-08-22-01',
      }),
    ])
  })

  it('keeps workouts with unknown gym_id references as runtime warnings', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'unknown-gym',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions[0].gym).toMatchObject({
      id: 'unknown-gym',
      resolution: {
        state: 'missing',
        originalId: 'unknown-gym',
        resolvedId: null,
      },
    })
    expect(result.sessions[0].gym).not.toHaveProperty('name')
    expect(result.sessions[0].gym).not.toHaveProperty('short_name')
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'MASTER_REFERENCE_MISSING',
        referenceKind: 'gym',
        resolutionState: 'missing',
        originalId: 'unknown-gym',
        resolvedId: null,
        sessionId: '2026-08-22-01',
      }),
    ])
  })

  it('keeps workouts with deleted gym references as runtime warnings', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'deleted-gym',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
      {
        ...sampleMasterData,
        gyms: {
          schema_version: 1,
          gyms: [
            {
              gym_id: 'deleted-gym',
              name: 'Deleted Gym',
              short_name: 'DG',
              active: false,
              deleted: true,
              main: false,
            },
          ],
        },
      },
    )

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].gym).toMatchObject({
      id: 'deleted-gym',
      resolution: {
        state: 'deleted',
        originalId: 'deleted-gym',
        resolvedId: 'deleted-gym',
      },
    })
    expect(result.sessions[0].gym).not.toHaveProperty('name')
    expect(result.sessions[0].gym).not.toHaveProperty('short_name')
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'MASTER_REFERENCE_DELETED',
        referenceKind: 'gym',
        resolutionState: 'deleted',
        originalId: 'deleted-gym',
        resolvedId: 'deleted-gym',
        sessionId: '2026-08-22-01',
      }),
    ])
  })

  it('keeps workouts with deleted machine references as runtime warnings', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'deleted-machine',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
      {
        ...sampleMasterData,
        machines: {
          schema_version: 1,
          machines: [
            {
              machine_id: 'deleted-machine',
              name: 'Deleted Machine',
              body_part: 'chest',
              aliases: [],
              active: false,
              deleted: true,
            },
          ],
        },
      },
    )

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].machines[0]).toMatchObject({
      machine_id: 'deleted-machine',
      sets: [{ set: 1, weight_kg: 40, reps: 12 }],
      resolution: {
        state: 'deleted',
        originalId: 'deleted-machine',
        resolvedId: 'deleted-machine',
      },
    })
    expect(result.sessions[0].machines[0]).not.toHaveProperty('name')
    expect(result.sessions[0].machines[0]).not.toHaveProperty('body_part')
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'MASTER_REFERENCE_DELETED',
        referenceKind: 'machine',
        resolutionState: 'deleted',
        originalId: 'deleted-machine',
        resolvedId: 'deleted-machine',
        sessionId: '2026-08-22-01',
      }),
    ])
  })

  it('rejects sets with missing required fields instead of generating set numbers', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [{ weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Set at index 0 requires numeric set, weight_kg, and reps.',
        'Machine "abdominal" has no valid sets.',
      ]),
    )
  })

  it('rejects complete sessions when machines have empty sets', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'af-shioiri',
        machines: [
          {
            machine_id: 'abdominal',
            sets: [],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Machine "abdominal" requires at least one set.',
        'Complete workout session requires at least one valid machine.',
      ]),
    )
  })

  it('allows partial sessions with no machines for intentionally incomplete logs', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        machines: [],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].machines).toEqual([])
  })

  it('collects parse issues without dropping valid files', () => {
    const result = loadWorkoutSessionsFromFiles([
      {
        path: 'valid.json',
        content:
          '{"schema_version":1,"session_id":"2026-08-22-01","date":"2026-08-22","status":"partial","gym_id":"af-shioiri","machines":[]}',
      },
      { path: 'invalid.json', content: '{' },
    ])

    expect(result.sessions).toHaveLength(1)
    expect(result.issues).toHaveLength(1)
  })

  it('validates machine master records', () => {
    const result = parseMachineMaster(
      'master/machines.json',
      JSON.stringify({
        schema_version: 1,
        machines: [
          {
            machine_id: 'rear-delt',
            name: 'リアデルト',
            body_part: 'shoulders',
            aliases: [],
            active: true,
            deleted: true,
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.master?.machines[0].body_part).toBe('shoulders')
    expect(result.master?.machines[0].deleted).toBe(true)
  })

  it('defaults missing logical delete flags to false for existing master records', () => {
    const machineResult = parseMachineMaster(
      'master/machines.json',
      JSON.stringify({
        schema_version: 1,
        machines: [
          {
            machine_id: 'rear-delt',
            name: 'リアデルト',
            body_part: 'shoulders',
            active: true,
          },
        ],
      }),
    )
    const gymResult = parseGymMaster(
      'master/gyms.json',
      JSON.stringify({
        schema_version: 1,
        gyms: [
          { gym_id: 'af-shioiri', name: 'A', active: true },
        ],
      }),
    )

    expect(machineResult.issues).toEqual([])
    expect(machineResult.master?.machines[0].deleted).toBe(false)
    expect(gymResult.issues).toEqual([])
    expect(gymResult.master?.gyms[0].deleted).toBe(false)
    expect(gymResult.master?.gyms[0].main).toBe(false)
  })

  it('reports duplicate master ids', () => {
    const result = parseGymMaster(
      'master/gyms.json',
      JSON.stringify({
        schema_version: 1,
        gyms: [
          { gym_id: 'af-shioiri', name: 'A', active: true },
          { gym_id: 'af-shioiri', name: 'B', active: true },
        ],
      }),
    )

    expect(result.master).toBeUndefined()
    expect(result.issues.some((issue) => issue.message.includes('Duplicate gym_id'))).toBe(true)
  })

  it('normalizes source_ids as master reference aliases', async () => {
    const result = loadWorkoutSessionsFromFiles([
      { path: 'workouts/legacy.json', content: '{"schema_version":1,"session_id":"legacy","date":"2026-08-22","status":"complete","gym_id":"legacy-gym","machines":[{"machine_id":"legacy-machine","sets":[{"set":1,"weight_kg":10,"reps":10}]}]}' },
    ], {
      machines: {
        schema_version: 1,
        machines: [{ machine_id: 'known-machine', source_ids: ['legacy-machine'], name: 'Known Machine', body_part: 'chest', aliases: [], active: true, deleted: false }],
      },
      gyms: {
        schema_version: 1,
        gyms: [{ gym_id: 'known-gym', source_ids: ['legacy-gym'], name: 'Known Gym', active: true, deleted: false, main: false }],
      },
    })

    const session = result.sessions[0]
    expect(result.issues).toEqual([])
    expect(session.gym.id).toBe('known-gym')
    expect(session.machines[0].machine_id).toBe('known-machine')
  })
})
