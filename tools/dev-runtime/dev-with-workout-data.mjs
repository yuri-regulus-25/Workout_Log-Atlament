import { spawn } from 'node:child_process'

const command = process.argv[2]
const args = process.argv.slice(3)

if (!command) {
  console.error('Usage: node tools/dev-runtime/dev-with-workout-data.mjs <command> [...args]')
  process.exit(1)
}

const dataApi = spawn(process.execPath, ['tools/dev-runtime/workout-data-api.mjs'], {
  stdio: 'inherit',
})

const app = spawn(command, args, {
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

app.on('exit', (code, signal) => {
  dataApi.kill()

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

process.on('SIGINT', () => {
  dataApi.kill()
  app.kill()
})

process.on('SIGTERM', () => {
  dataApi.kill()
  app.kill()
})
