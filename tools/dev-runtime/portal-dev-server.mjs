import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../src/frontend/portal/src/', import.meta.url))
const frontendCommonRoot = fileURLToPath(new URL('../../src/shared/frontend-common/src/', import.meta.url))
const port = 5174

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const filePath = resolveFile(url.pathname)

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
})

server.on('error', (error) => {
  console.error(`Portal development server failed: ${error.message}`)
  process.exit(1)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Atlament Portal development server: http://127.0.0.1:${port}/`)
})

function resolveFile(pathname) {
  const decodedPathname = decodeURIComponent(pathname)
  if (decodedPathname.startsWith('/frontend-common/')) {
    const common = safeJoin(frontendCommonRoot, decodedPathname.replace('/frontend-common/', ''))
    if (common && existsSync(common) && isFileSync(common)) {
      return common
    }
  }

  const direct = safeJoin(root, pathname === '/' ? 'index.html' : decodedPathname)
  if (direct && existsSync(direct) && isFileSync(direct)) {
    return direct
  }

  return null
}

function safeJoin(base, ...parts) {
  const resolved = normalize(join(base, ...parts.map((part) => part.replace(/^[/\\]+/, ''))))
  return resolved.startsWith(normalize(base)) ? resolved : null
}

function isFileSync(path) {
  return existsSync(path) && statSync(path).isFile()
}
