import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'

const repoRoot = process.cwd()
const masterDirectory = join(repoRoot, 'data', 'master')
const workoutsDirectory = join(repoRoot, 'data', 'workouts')
const port = Number(process.env.WORKOUT_DATA_API_PORT ?? 4317)

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (url.pathname !== '/api/workout-data') {
    writeJson(response, 404, { error: 'Not found' })
    return
  }

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
      error: error instanceof Error ? error.message : 'Failed to load workout files.',
    })
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Workout data API: http://127.0.0.1:${port}/api/workout-data`)
})

async function loadMasterData(directory) {
  const [exercises, gyms] = await Promise.all([
    readJson(join(directory, 'exercises.json')),
    readJson(join(directory, 'gyms.json')),
  ])

  return { exercises, gyms }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function collectWorkoutFiles(directory) {
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

function writeJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function normalizePath(path) {
  return path.replaceAll('\\\\', '/')
}
