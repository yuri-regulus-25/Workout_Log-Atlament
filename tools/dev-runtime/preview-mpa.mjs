import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../dist/', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const masterDirectory = join(repoRoot, 'data', 'master')
const workoutsDirectory = join(repoRoot, 'data', 'workouts')
const port = Number(process.env.PORT ?? 4173)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (url.pathname === '/api/workout-data') {
    await respondWorkoutData(response)
    return
  }

  const filePath = resolveFile(url.pathname)

  if (!filePath) {
    const notFoundPath = safeJoin(root, '404.html')

    response.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
    })

    if (notFoundPath && existsSync(notFoundPath) && isFileSync(notFoundPath)) {
      createReadStream(notFoundPath).pipe(response)
      return
    }

    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Atlament MPA preview: http://127.0.0.1:${port}/`)
})

async function respondWorkoutData(response) {
  try {
    const masterData = await loadMasterData(masterDirectory)
    const files = await collectWorkoutFiles(workoutsDirectory)
    const payload = await Promise.all(
      files.map(async (filePath) => ({
        path: normalizePath(relative(repoRoot, filePath)),
        content: await readFile(filePath, 'utf8'),
      })),
    )

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({ masterData, files: payload }))
  } catch (error) {
    response.writeHead(500, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to load workout files.',
    }))
  }
}

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

function resolveFile(pathname) {
  const direct = safeJoin(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname))
  const index = safeJoin(root, decodeURIComponent(pathname), 'index.html')

  if (direct && existsSync(direct) && isFileSync(direct)) {
    return direct
  }

  if (index && existsSync(index) && isFileSync(index)) {
    return index
  }

  const fallback = resolveDefinedMpaRoute(pathname)
  return fallback ? safeJoin(root, fallback) : null
}

function resolveDefinedMpaRoute(pathname) {
  const normalized = pathname.replace(/\/+$/, '')
  if (/^\/workouts\/\d{4}-\d{2}-\d{2}$/.test(normalized)) return 'workouts/index.html'
  if (/^\/exercises\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test(normalized)) return 'exercises/index.html'
  return null
}

function safeJoin(base, ...parts) {
  const resolved = normalize(join(base, ...parts.map((part) => part.replace(/^[/\\]+/, ''))))
  return resolved.startsWith(normalize(base)) ? resolved : null
}

function isFileSync(path) {
  return existsSync(path) && statSync(path).isFile()
}

function normalizePath(path) {
  return path.replaceAll('\\\\', '/')
}
