import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadMasterDataFromDirectory, loadWorkoutSessionsFromDirectory } from './node'

describe('workout-data node loader', () => {
  it('loads JSON and JSONL files recursively from a workouts directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'workout-lab-'))
    const month = join(root, '2026', '08')
    await mkdir(month, { recursive: true })
    await writeFile(
      join(month, '2026-08-22.json'),
      '{"schema_version":1,"session_id":"2026-08-22-01","date":"2026-08-22","status":"complete","gym_id":"af-shioiri","exercises":[{"exercise_id":"abdominal","sets":[{"set":1,"weight_kg":40,"reps":12}]}]}',
    )
    await writeFile(
      join(month, '2026-08-23.jsonl'),
      '{"schema_version":1,"session_id":"2026-08-23-01","date":"2026-08-23","status":"complete","gym_id":"af-akihabara","exercises":[{"exercise_id":"lat-pulldown","sets":[{"set":1,"weight_kg":50,"reps":10}]}]}',
    )

    const result = await loadWorkoutSessionsFromDirectory(root)

    expect(result.issues).toEqual([])
    expect(result.sessions.map((session) => session.session_id)).toEqual([
      '2026-08-22-01',
      '2026-08-23-01',
    ])
  })

  it('loads master data from a master directory and resolves workout references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'workout-lab-'))
    const master = join(root, 'master')
    const workouts = join(root, 'workouts', '2026', '08')
    await mkdir(master, { recursive: true })
    await mkdir(workouts, { recursive: true })
    await writeFile(
      join(master, 'exercises.json'),
      '{"schema_version":1,"exercises":[{"exercise_id":"rear-delt","name":"リアデルト","body_part":"shoulders","aliases":[],"active":true}]}',
    )
    await writeFile(
      join(master, 'gyms.json'),
      '{"schema_version":1,"gyms":[{"gym_id":"af-shioiri","name":"エニタイムフィットネス 横須賀汐入店","short_name":"AF横須賀汐入","active":true}]}',
    )
    await writeFile(
      join(workouts, '2026-08-24.json'),
      '{"schema_version":1,"session_id":"2026-08-24-01","date":"2026-08-24","status":"complete","gym_id":"af-shioiri","exercises":[{"exercise_id":"rear-delt","sets":[{"set":1,"weight_kg":20,"reps":12}]}]}',
    )

    const masterResult = await loadMasterDataFromDirectory(master)
    const result = await loadWorkoutSessionsFromDirectory(workouts, masterResult.masterData)

    expect(masterResult.issues).toEqual([])
    expect(result.issues).toEqual([])
    expect(result.sessions[0].gym.short_name).toBe('AF横須賀汐入')
    expect(result.sessions[0].exercises[0]).toMatchObject({
      name: 'リアデルト',
      body_part: 'shoulders',
    })
  })
})
