import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'
import {
  loadMasterDataFromDirectory,
  loadWorkoutSessionsFromDirectory,
} from '@workout-lab/workout-data/node'

const repoRoot = process.cwd()
const masterDirectory = join(repoRoot, 'data', 'master')
const workoutsDirectory = join(repoRoot, 'data', 'workouts')
const versionFile = join(repoRoot, 'src', 'version.json')
const port = Number(process.env.DEVELOPMENT_RUNTIME_PORT ?? 5180)

const apiRoutes = new Set([
  '/api/v1/common/status',
  '/api/v1/common/runtime/workouts',
  '/api/workout-data',
])

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (!apiRoutes.has(url.pathname)) {
    writeJson(response, 404, fail('COMMON_NOT_FOUND', 'Development Runtime API route is not found.', true))
    return
  }

  try {
    if (url.pathname.endsWith('/status')) {
      await respondStatus(response)
      return
    }

    if (url.pathname.endsWith('/runtime/workouts')) {
      await respondRuntimeWorkouts(response)
      return
    }

    await respondLegacyWorkoutData(response)
  } catch (error) {
    writeJson(response, 500, fail(
      'COMMON_INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Development Runtime API failed.',
      true,
    ))
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Atlament Node Development Runtime: http://127.0.0.1:${port}/`)
  console.log('API:')
  console.log('  GET /api/v1/common/status')
  console.log('  GET /api/v1/common/runtime/workouts')
  console.log('  GET /api/workout-data')
})

async function respondStatus(response) {
  const runtime = await loadRuntimeWorkoutData()
  const versions = await loadVersions()
  const runtimeAvailable = runtime.success

  writeJson(response, 200, ok({
    versions,
    application: {
      status: runtimeAvailable ? 'ready' : 'degraded',
      degraded: !runtimeAvailable,
      acceptingRequests: true,
    },
    operations: {
      startup: 'completed',
      manualSync: 'idle',
      configurationUpdate: 'idle',
      credentialUpdate: 'idle',
      shutdown: 'idle',
    },
    components: {
      configuration: 'unknown',
      credential: 'unknown',
      github: 'unknown',
      runtimeData: runtimeAvailable ? 'available' : 'unavailable',
      hosting: {
        portal: 'unknown',
        dashboard: 'unknown',
        workouts: 'unknown',
        machines: 'unknown',
        analytics: 'unknown',
        settings: 'unknown',
      },
    },
    requiredActions: runtimeAvailable ? [] : ['RUNTIME_DATA_REQUIRED'],
  }, runtime.errors))
}

async function loadVersions() {
  const version = JSON.parse(await readFile(versionFile, 'utf8'))
  return {
    applicationFramework: 'development',
    frontendFramework: version.frontend,
    nativePackages: {
      windows: {
        version: version.windows,
      },
      android: {
        versionName: version.android.versionName,
        versionCode: version.android.versionCode,
      },
    },
  }
}

async function respondRuntimeWorkouts(response) {
  const runtime = await loadRuntimeWorkoutData()

  if (!runtime.success) {
    writeJson(response, 503, failMany(runtime.errors))
    return
  }

  writeJson(response, 200, ok({ sessions: runtime.sessions }, runtime.errors))
}

async function respondLegacyWorkoutData(response) {
  const runtime = await loadLegacyWorkoutData()

  if (runtime.errors.length > 0) {
    writeJson(response, 500, {
      error: runtime.errors.map((error) => error.message).join(' / '),
    })
    return
  }

  writeJson(response, 200, {
    masterData: runtime.masterData,
    files: runtime.files,
  })
}

async function loadLegacyWorkoutData() {
  const errors = []
  let masterData = null
  let files = []

  try {
    masterData = await loadMasterData(masterDirectory)
  } catch (error) {
    errors.push(toError('RUNTIME_DATA_UNAVAILABLE', error, 'Master data is unavailable.'))
  }

  try {
    const workoutFiles = await collectWorkoutFiles(workoutsDirectory)
    files = await Promise.all(
      workoutFiles.map(async (filePath) => ({
        path: normalizePath(relative(repoRoot, filePath)),
        content: await readFile(filePath, 'utf8'),
      })),
    )
  } catch (error) {
    errors.push(toError('RUNTIME_DATA_UNAVAILABLE', error, 'Workout data is unavailable.'))
  }

  return { masterData, files, errors }
}

async function loadRuntimeWorkoutData() {
  const masterResult = await loadMasterDataFromDirectory(masterDirectory)
  if (!masterResult.masterData || masterResult.issues.length > 0) {
    return {
      success: false,
      sessions: [],
      errors: masterResult.issues.map(toAfError),
    }
  }

  const workoutResult = await loadWorkoutSessionsFromDirectory(workoutsDirectory, masterResult.masterData)
  const errors = workoutResult.issues.map(toAfError)

  if (errors.length > 0) {
    return {
      success: false,
      sessions: [],
      errors,
    }
  }

  return {
    success: true,
    sessions: workoutResult.sessions,
    errors,
  }
}

async function loadMasterData(directory) {
  const [machines, gyms] = await Promise.all([
    readJson(join(directory, 'machines.json')),
    readJson(join(directory, 'gyms.json')),
  ])

  return { machines, gyms }
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

function ok(data, errors = []) {
  return {
    success: true,
    errors,
    data,
  }
}

function fail(code, message, recoverable) {
  return {
    success: false,
    errors: [{ code, message, recoverable }],
    data: null,
  }
}

function failMany(errors) {
  return {
    success: false,
    errors,
    data: null,
  }
}

function toError(code, error, fallback) {
  return {
    code,
    message: error instanceof Error ? error.message : fallback,
    recoverable: true,
  }
}

function toAfError(issue) {
  const location = issue.line === undefined
    ? issue.filePath
    : `${issue.filePath}:${issue.line}`
  const message = `${location}: ${issue.message}`

  if (issue.message.startsWith('Unknown machine_id:')) {
    return {
      code: 'MASTER_MACHINE_NOT_FOUND',
      message,
      recoverable: true,
    }
  }

  if (issue.message.startsWith('Unknown gym_id:')) {
    return {
      code: 'MASTER_GYM_NOT_FOUND',
      message,
      recoverable: true,
    }
  }

  return {
    code: 'RUNTIME_DATA_INVALID',
    message,
    recoverable: false,
  }
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
