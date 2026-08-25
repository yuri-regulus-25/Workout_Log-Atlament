import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

const requiredPorts = [
  { name: 'Development Gateway', port: 5173 },
  { name: 'Portal', port: 5174 },
  { name: 'Dashboard', port: 5175 },
  { name: 'Workouts', port: 5176 },
  { name: 'Exercises', port: 5177 },
  { name: 'Analytics', port: 5178 },
  { name: 'Settings', port: 5179 },
  { name: 'Node Development Runtime', port: 5180 },
]

for (const item of requiredPorts) {
  await assertPortAvailable(item)
}

const processes = [
  start('portal', process.execPath, ['tools/dev-runtime/portal-dev-server.mjs']),
  start('development-runtime', process.execPath, ['tools/dev-runtime/development-runtime.mjs']),
  startNpm('dashboard', ['run', 'watch:dashboard']),
  startNpm('workouts', ['run', 'watch:workouts']),
  startNpm('exercises', ['run', 'watch:exercises']),
  startNpm('analytics', ['run', 'watch:analytics']),
  startNpm('settings', ['run', 'watch:settings']),
  start('gateway', process.execPath, ['tools/dev-runtime/development-gateway.mjs']),
]

let shuttingDown = false

for (const child of processes) {
  child.process.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    stopChildren()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    console.error(`watch child exited: ${child.name}`)
    process.exit(code ?? 0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

async function assertPortAvailable({ name, port }) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', (error) => {
      reject(new Error(`${name} port ${port} is unavailable: ${error.message}`))
    })
    server.once('listening', () => {
      server.close(resolve)
    })
    server.listen(port, '127.0.0.1')
  })
}

function start(name, command, args) {
  return {
    name,
    process: spawn(command, args, {
      env: process.env,
      stdio: 'inherit',
    }),
  }
}

function startNpm(name, args) {
  return process.platform === 'win32'
    ? start(name, 'cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')])
    : start(name, 'npm', args)
}

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  stopChildren()
}

function stopChildren() {
  for (const child of processes) {
    if (!child.process.killed) {
      terminate(child.process)
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
