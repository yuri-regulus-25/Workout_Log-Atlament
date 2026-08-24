import { describe, expect, it } from 'vitest'
import {
  loadSampleWorkoutSessions,
  loadWorkoutSessionsFromFiles,
  parseExerciseMaster,
  parseGymMaster,
  parseWorkoutJson,
  parseWorkoutJsonl,
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
        exercises: [
          {
            exercise_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions[0].date).toBe('2026-08-22')
    expect(result.sessions[0].gym.name).toBe('エニタイムフィットネス 横須賀汐入店')
    expect(result.sessions[0].exercises[0]).toMatchObject({
      exercise_id: 'abdominal',
      name: 'アブドミナル',
      body_part: 'core',
    })
  })

  it('parses JSONL as one session per line', () => {
    const result = parseWorkoutJsonl(
      'workouts/2026/08/2026-08-22.jsonl',
      [
        '{"schema_version":1,"session_id":"2026-08-22-01","date":"2026-08-22","status":"complete","gym_id":"af-shioiri","exercises":[{"exercise_id":"abdominal","sets":[{"set":1,"weight_kg":40,"reps":12}]}]}',
        '{"schema_version":1,"session_id":"2026-08-22-02","date":"2026-08-22","status":"complete","gym_id":"af-akihabara","exercises":[{"exercise_id":"lat-pulldown","sets":[{"set":1,"weight_kg":50,"reps":10}]}]}',
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
        exercises: [
          {
            exercise_id: 'hip-abduction',
            sets: [{ set: 1, weight_kg: 65, reps: 10 }],
          },
        ],
      }),
    )

    expect(result.sessions[0].status).toBe('partial')
    expect(result.sessions[0].gym.name).toBe('エニタイムフィットネス 横須賀汐入店')
    expect(result.sessions[0].exercises[0].exercise_id).toBe('hip-abduction')
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
        exercises: [],
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
        exercises: [
          {
            exercise_id: 'hip-abduction',
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
        'Unknown gym_id: unknown-gym.',
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
        exercises: [
          {
            exercise_id: 'abdominal',
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
        exercises: [
          {
            exercise_id: 'abdominal',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.some((issue) => issue.message.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('rejects exercises with missing exercise_id instead of generating placeholders', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        exercises: [
          {
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Exercise at index 0 is missing exercise_id.',
      ]),
    )
  })

  it('rejects unknown exercise_id references', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        exercises: [
          {
            exercise_id: 'unknown-exercise',
            sets: [{ set: 1, weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.some((issue) => issue.message.includes('Unknown exercise_id'))).toBe(true)
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
        exercises: [
          {
            exercise_id: 'abdominal',
            sets: [{ weight_kg: 40, reps: 12 }],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Set at index 0 requires numeric set, weight_kg, and reps.',
        'Exercise "abdominal" has no valid sets.',
      ]),
    )
  })

  it('rejects complete sessions when exercises have empty sets', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'complete',
        gym_id: 'af-shioiri',
        exercises: [
          {
            exercise_id: 'abdominal',
            sets: [],
          },
        ],
      }),
    )

    expect(result.sessions).toEqual([])
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Exercise "abdominal" requires at least one set.',
        'Complete workout session requires at least one valid exercise.',
      ]),
    )
  })

  it('allows partial sessions with no exercises for intentionally incomplete logs', () => {
    const result = parseWorkoutJson(
      'workouts/2026/08/2026-08-22.json',
      JSON.stringify({
        schema_version: 1,
        session_id: '2026-08-22-01',
        date: '2026-08-22',
        status: 'partial',
        gym_id: 'af-shioiri',
        exercises: [],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].exercises).toEqual([])
  })

  it('collects parse issues without dropping valid files', () => {
    const result = loadWorkoutSessionsFromFiles([
      {
        path: 'valid.json',
        content:
          '{"schema_version":1,"session_id":"2026-08-22-01","date":"2026-08-22","status":"partial","gym_id":"af-shioiri","exercises":[]}',
      },
      { path: 'invalid.json', content: '{' },
    ])

    expect(result.sessions).toHaveLength(1)
    expect(result.issues).toHaveLength(1)
  })

  it('validates exercise master records', () => {
    const result = parseExerciseMaster(
      'master/exercises.json',
      JSON.stringify({
        schema_version: 1,
        exercises: [
          {
            exercise_id: 'rear-delt',
            name: 'リアデルト',
            body_part: 'shoulders',
            aliases: [],
            active: true,
          },
        ],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.master?.exercises[0].body_part).toBe('shoulders')
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
})
