import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['tools/dev-runtime/portal-dev-server.mjs'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['tools/dev-runtime/development-gateway.mjs'], {
    stdio: 'inherit',
  }),
]

let shuttingDown = false

for (const child of processes) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    stopChildren()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  stopChildren()
}

function stopChildren() {
  for (const child of processes) {
    if (!child.killed) {
      terminate(child)
    }
  }
}

function terminate(child) {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    })
    return
  }

  child.kill()
}
