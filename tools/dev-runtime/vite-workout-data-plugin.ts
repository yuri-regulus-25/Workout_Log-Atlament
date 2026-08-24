import { readFile, readdir } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin } from 'vite'

const repoRoot = dirname(fileURLToPath(new URL('../../package.json', import.meta.url)))
const masterDirectory = join(repoRoot, 'data', 'master')
const workoutsDirectory = join(repoRoot, 'data', 'workouts')

export function workoutDataPlugin(): Plugin {
  return {
    name: 'workout-data-runtime-api',
    configureServer(server) {
      server.middlewares.use('/api/workout-data', workoutDataMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/workout-data', workoutDataMiddleware)
    },
  }
}

const workoutDataMiddleware: Connect.NextHandleFunction = async (_request, response) => {
  try {
    const masterData = await loadMasterData(masterDirectory)
    const files = await collectWorkoutFiles(workoutsDirectory)
    const payload = await Promise.all(
      files.map(async (filePath) => ({
        path: normalizePath(relative(repoRoot, filePath)),
        content: await readFile(filePath, 'utf8'),
      })),
    )

    writeJson(response, 200, { masterData, files: payload })
  } catch (error) {
    writeJson(response, 500, {
      error: error instanceof Error ? error.message : 'Failed to load workout data.',
    })
  }
}

async function loadMasterData(directory: string) {
  const [exercises, gyms] = await Promise.all([
    readJson(join(directory, 'exercises.json')),
    readJson(join(directory, 'gyms.json')),
  ])

  return { exercises, gyms }
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
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

function writeJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function normalizePath(path: string) {
  return path.replaceAll('\\\\', '/')
}
