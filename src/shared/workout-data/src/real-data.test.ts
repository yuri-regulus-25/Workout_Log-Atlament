import { readdir, readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadRuntimeWorkoutSessions } from './index'
import { loadMasterDataFromDirectory, loadWorkoutSessionsFromDirectory } from './node'

describe('real workout data', () => {
  const repoRoot = resolve(process.cwd())
  const masterDirectory = join(repoRoot, 'data', 'master')
  const workoutsDirectory = join(repoRoot, 'data', 'workouts')

  it('loads committed master data and workout logs without validation issues', async () => {
    const masterResult = await loadMasterDataFromDirectory(masterDirectory)

    expect(masterResult.issues).toEqual([])
    expect(masterResult.masterData).toBeDefined()
    expect(masterResult.masterData?.machines.machines).toHaveLength(19)
    expect(masterResult.masterData?.gyms.gyms).toHaveLength(4)
    expect(masterResult.masterData?.machines.machines.every((machine) => machine.deleted === false)).toBe(true)
    expect(masterResult.masterData?.gyms.gyms.every((gym) => gym.deleted === false)).toBe(true)
    expect(masterResult.masterData?.gyms.gyms.every((gym) => gym.main === false)).toBe(true)

    const result = await loadWorkoutSessionsFromDirectory(workoutsDirectory, masterResult.masterData)
    const rawSessionCount = await countRawWorkoutSessions(workoutsDirectory)

    expect(result.issues).toEqual([])
    expect(result.masterData).toEqual(masterResult.masterData)
    expect(result.sessions).toHaveLength(rawSessionCount)
    expect(new Set(result.sessions.map((session) => session.session_id)).size).toBe(
      result.sessions.length,
    )
    expect(result.sessions.every((session) => session.gym.name.length > 0)).toBe(true)
    expect(
      result.sessions.every((session) =>
        session.machines.every(
          (machine) =>
            machine.name.length > 0 && machine.body_part.length > 0 && machine.sets.length > 0,
        ),
      ),
    ).toBe(true)
  })

  it('keeps complete and partial session invariants for real workout logs', async () => {
    const masterResult = await loadMasterDataFromDirectory(masterDirectory)
    const result = await loadWorkoutSessionsFromDirectory(workoutsDirectory, masterResult.masterData)

    expect(result.sessions.length).toBeGreaterThan(0)
    expect(
      result.sessions.every((session) => session.status === 'partial' || session.machines.length > 0),
    ).toBe(true)
    expect(
      result.sessions.every((session) =>
        session.machines.every((machine) =>
          machine.sets.every(
            (set) =>
              Number.isFinite(set.set) &&
              Number.isFinite(set.weight_kg) &&
              Number.isFinite(set.reps),
          ),
        ),
      ),
    ).toBe(true)
  })

  it('loads runtime workout files without embedding workout logs in the frontend bundle', async () => {
    const masterResult = await loadMasterDataFromDirectory(masterDirectory)
    const rawSessionCount = await countRawWorkoutSessions(workoutsDirectory)
    const files = await collectWorkoutFiles(workoutsDirectory)
    const responseFiles = await Promise.all(
      files.map(async (filePath) => ({
        path: filePath,
        content: await readFile(filePath, 'utf8'),
      })),
    )
    const result = await loadRuntimeWorkoutSessions({
      endpoints: ['/api/workout-data'],
      fetcher: async () =>
        new Response(JSON.stringify({ masterData: masterResult.masterData, files: responseFiles }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    })

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(rawSessionCount)
    expect(result.sessions[0].gym.name.length).toBeGreaterThan(0)
    expect(result.sessions.some((session) => session.machines.some((machine) => machine.name === 'リアデルト'))).toBe(true)
  })

  it('loads normalized runtime sessions from the Windows AF runtime API contract', async () => {
    const masterResult = await loadMasterDataFromDirectory(masterDirectory)
    const files = await collectWorkoutFiles(workoutsDirectory)
    const responseFiles = await Promise.all(
      files.map(async (filePath) => ({
        path: filePath,
        content: await readFile(filePath, 'utf8'),
      })),
    )
    const normalized = loadRuntimeWorkoutSessions({
      endpoints: ['/api/workout-data'],
      fetcher: async () =>
        new Response(JSON.stringify({ masterData: masterResult.masterData, files: responseFiles }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    const expected = await normalized

    const result = await loadRuntimeWorkoutSessions({
      endpoints: ['/api/v1/common/runtime/workouts'],
      fetcher: async () =>
        new Response(JSON.stringify({
          success: true,
          errors: [],
          data: { sessions: expected.sessions },
        }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    })

    expect(result.issues).toEqual([])
    expect(result.sessions).toHaveLength(expected.sessions.length)
    expect(result.sessions[0].gym.name.length).toBeGreaterThan(0)
  })
})

async function countRawWorkoutSessions(directory: string): Promise<number> {
  const files = await collectWorkoutFiles(directory)
  const counts = await Promise.all(files.map((filePath) => countWorkoutSessionsInFile(filePath)))

  return counts.reduce((total, count) => total + count, 0)
}

async function collectWorkoutFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectWorkoutFiles(path)
      }

      return ['.json', '.jsonl'].includes(extname(entry.name)) ? [path] : []
    }),
  )

  return files.flat().sort()
}

async function countWorkoutSessionsInFile(filePath: string): Promise<number> {
  const content = await readFile(filePath, 'utf8')

  if (filePath.endsWith('.jsonl')) {
    return content.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  }

  return 1
}
