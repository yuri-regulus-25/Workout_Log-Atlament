import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const paths = {
  version: path.join(root, 'src', 'version.json'),
  packageJson: path.join(root, 'package.json'),
  windowsProject: path.join(root, 'src', 'application', 'windows', 'Atlament.csproj'),
  windowsServices: path.join(root, 'src', 'application', 'windows', 'Core', 'AfServices.cs'),
  windowsModels: path.join(root, 'src', 'application', 'windows', 'Core', 'AfModels.cs'),
  androidGradle: path.join(root, 'src', 'application', 'android', 'app', 'build.gradle.kts'),
  androidServer: path.join(root, 'src', 'application', 'android', 'app', 'src', 'main', 'java', 'jp', 'yuri_regulus_25', 'atlament', 'AndroidLocalhostServer.kt'),
  frontendCommon: path.join(root, 'src', 'shared', 'frontend-common', 'src', 'index.ts'),
  buildMpa: path.join(root, 'tools', 'build', 'build-mpa.mjs'),
  devRuntime: path.join(root, 'tools', 'dev-runtime', 'development-runtime.mjs'),
}

const targets = new Set(['frontend', 'windows', 'android', 'all'])
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const options = parseArgs(args)

  if (command === 'check') {
    const state = await readState()
    const result = validateState(state)
    printCheck(result)
    process.exit(result.ok ? 0 : 1)
  }

  if (command === 'set') {
    await setVersion(options)
    return
  }

  throw new Error('Usage: atlament-version.mjs <check|set> [--target <target>] [--version <x.y.z>]')
}

function parseArgs(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`)
    }

    const key = arg.slice(2)
    if (key === 'dry-run' || key === 'bump-version-code') {
      options[key] = true
      continue
    }

    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    options[key] = value
    index += 1
  }
  return options
}

async function setVersion(options) {
  const target = options.target
  const version = options.version
  const dryRun = Boolean(options['dry-run'])

  if (!targets.has(target)) {
    throw new Error(`Invalid target: ${target ?? '(missing)'}`)
  }
  if (!isSemver(version)) {
    throw new Error(`Invalid semantic version: ${version ?? '(missing)'}`)
  }

  const state = await readState()
  const currentValidation = validateState(state)
  if (!currentValidation.ok) {
    printCheck(currentValidation)
    throw new Error('Current version state is inconsistent. Fix it before running version:set.')
  }

  const nextVersionCode = resolveNextVersionCode(target, options, state)
  const changes = calculateChanges({ target, version, nextVersionCode, state })
  const warnings = []
  if (changes.length === 0) warnings.push('No file changes are required.')
  if (target === 'frontend' && compareSemver(version, state.versionJson.frontend) === 0) warnings.push('Frontend version is unchanged.')
  if (target === 'windows' && compareSemver(version, state.versionJson.windows) === 0) warnings.push('Windows version is unchanged.')
  if (target === 'android' && compareSemver(version, state.versionJson.android.versionName) === 0) warnings.push('Android versionName is unchanged.')
  if (target === 'all') {
    if (compareSemver(version, state.versionJson.frontend) === 0) warnings.push('Frontend version is unchanged.')
    if (compareSemver(version, state.versionJson.windows) === 0) warnings.push('Windows version is unchanged.')
    if (compareSemver(version, state.versionJson.android.versionName) === 0) warnings.push('Android versionName is unchanged.')
  }

  validateCalculatedChanges(changes)
  printDryRun({ target, version, nextVersionCode, state, changes, warnings, currentValidation })

  if (dryRun) return
  await writeAndValidateAtomically(changes)
  console.log('Version update completed.')
}

function resolveNextVersionCode(target, options, state) {
  if (target !== 'android' && target !== 'all') return null

  const hasExplicit = options['version-code'] !== undefined
  const hasBump = Boolean(options['bump-version-code'])
  if (hasExplicit === hasBump) {
    throw new Error('Android updates require exactly one of --version-code <integer> or --bump-version-code.')
  }

  const current = state.versionJson.android.versionCode
  const next = hasBump ? current + 1 : Number(options['version-code'])
  if (!Number.isInteger(next) || next <= 0) {
    throw new Error(`Android versionCode must be a positive integer: ${options['version-code']}`)
  }
  if (next <= current) {
    throw new Error(`Android versionCode must increase. Current: ${current}, next: ${next}`)
  }
  return next
}

async function readState() {
  for (const [name, filePath] of Object.entries(paths)) {
    if (!existsSync(filePath)) {
      throw new Error(`Required file is missing: ${relative(filePath)} (${name})`)
    }
  }

  const files = Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([name, filePath]) => [name, await readFile(filePath, 'utf8')]),
  ))

  const versionJson = parseVersionJson(files.version)
  return {
    files,
    versionJson,
    windows: {
      version: singleXmlValue(files.windowsProject, 'Version', paths.windowsProject),
      fileVersion: singleXmlValue(files.windowsProject, 'FileVersion', paths.windowsProject),
      informationalVersion: singleXmlValue(files.windowsProject, 'InformationalVersion', paths.windowsProject),
    },
    android: {
      versionName: singleGradleValue(files.androidGradle, 'versionName', /versionName\s*=\s*"([^"]+)"/g),
      versionCode: Number(singleGradleValue(files.androidGradle, 'versionCode', /versionCode\s*=\s*(\d+)/g)),
    },
  }
}

function parseVersionJson(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`src/version.json is not valid JSON: ${error.message}`)
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('src/version.json must be an object.')
  if (typeof parsed.frontend !== 'string') throw new Error('src/version.json frontend must be a string.')
  if (typeof parsed.windows !== 'string') throw new Error('src/version.json windows must be a string.')
  if (!parsed.android || typeof parsed.android !== 'object') throw new Error('src/version.json android must be an object.')
  if (typeof parsed.android.versionName !== 'string') throw new Error('src/version.json android.versionName must be a string.')
  if (!Number.isInteger(parsed.android.versionCode) || parsed.android.versionCode <= 0) {
    throw new Error('src/version.json android.versionCode must be a positive integer.')
  }
  return parsed
}

function validateState(state) {
  const errors = []
  const expectedWindowsFileVersion = toFileVersion(state.versionJson.windows)

  for (const [label, value] of [
    ['frontend', state.versionJson.frontend],
    ['windows', state.versionJson.windows],
    ['android.versionName', state.versionJson.android.versionName],
  ]) {
    if (!isSemver(value)) errors.push(`Invalid SemVer at ${label}: ${value}`)
  }

  if (state.windows.version !== state.versionJson.windows) {
    errors.push(`Windows <Version> mismatch: ${state.windows.version} != ${state.versionJson.windows}`)
  }
  if (state.windows.informationalVersion !== state.versionJson.windows) {
    errors.push(`Windows <InformationalVersion> mismatch: ${state.windows.informationalVersion} != ${state.versionJson.windows}`)
  }
  if (state.windows.fileVersion !== expectedWindowsFileVersion) {
    errors.push(`Windows <FileVersion> mismatch: ${state.windows.fileVersion} != ${expectedWindowsFileVersion}`)
  }
  if (state.android.versionName !== state.versionJson.android.versionName) {
    errors.push(`Android versionName mismatch: ${state.android.versionName} != ${state.versionJson.android.versionName}`)
  }
  if (state.android.versionCode !== state.versionJson.android.versionCode) {
    errors.push(`Android versionCode mismatch: ${state.android.versionCode} != ${state.versionJson.android.versionCode}`)
  }
  return { ok: errors.length === 0, errors }
}

function calculateChanges({ target, version, nextVersionCode, state }) {
  const nextVersionJson = structuredClone(state.versionJson)
  if (target === 'frontend' || target === 'all') nextVersionJson.frontend = version
  if (target === 'windows' || target === 'all') nextVersionJson.windows = version
  if (target === 'android' || target === 'all') {
    nextVersionJson.android.versionName = version
    nextVersionJson.android.versionCode = nextVersionCode
  }

  const changes = []
  addChange(changes, paths.version, state.files.version, `${JSON.stringify(nextVersionJson, null, 2)}\n`, ['src/version.json'])

  if (target === 'windows' || target === 'all') {
    assertNotDowngrade('windows', state.versionJson.windows, version)
    let nextProject = replaceXmlValue(state.files.windowsProject, 'Version', version, paths.windowsProject)
    nextProject = replaceXmlValue(nextProject, 'FileVersion', toFileVersion(version), paths.windowsProject)
    nextProject = replaceXmlValue(nextProject, 'InformationalVersion', version, paths.windowsProject)
    addChange(changes, paths.windowsProject, state.files.windowsProject, nextProject, ['Version', 'FileVersion', 'InformationalVersion'])
  }

  if (target === 'android' || target === 'all') {
    assertNotDowngrade('android', state.versionJson.android.versionName, version)
    let nextGradle = replaceSingle(state.files.androidGradle, /versionCode\s*=\s*\d+/g, `versionCode = ${nextVersionCode}`, paths.androidGradle, 'versionCode')
    nextGradle = replaceSingle(nextGradle, /versionName\s*=\s*"[^"]+"/g, `versionName = "${version}"`, paths.androidGradle, 'versionName')
    addChange(changes, paths.androidGradle, state.files.androidGradle, nextGradle, ['versionName', 'versionCode'])
  }

  if (target === 'frontend' || target === 'all') {
    assertNotDowngrade('frontend', state.versionJson.frontend, version)
  }

  return changes
}

function addChange(changes, filePath, before, after, fields) {
  if (before === after) return
  changes.push({ filePath, before, after, fields })
}

function validateCalculatedChanges(changes) {
  const seen = new Set()
  for (const change of changes) {
    if (seen.has(change.filePath)) throw new Error(`Duplicate calculated change: ${relative(change.filePath)}`)
    seen.add(change.filePath)
    if (!existsSync(change.filePath)) throw new Error(`Cannot update missing file: ${relative(change.filePath)}`)
    if (change.before === change.after) throw new Error(`Empty change calculated: ${relative(change.filePath)}`)
  }
}

async function writeAndValidateAtomically(changes) {
  const backupDir = path.join(root, '.tmp-version-backup')
  await rm(backupDir, { recursive: true, force: true })
  await mkdir(backupDir, { recursive: true })
  const backups = []

  try {
    for (const change of changes) {
      const backupPath = path.join(backupDir, encodeURIComponent(path.relative(root, change.filePath)))
      await copyFile(change.filePath, backupPath)
      backups.push({ filePath: change.filePath, backupPath })
    }

    for (const change of changes) {
      const tmpPath = `${change.filePath}.tmp`
      await writeFile(tmpPath, change.after, 'utf8')
      await rename(tmpPath, change.filePath)
    }

    const nextState = await readState()
    const postValidation = validateState(nextState)
    if (!postValidation.ok) {
      throw new Error(`Post validation failed after writing files:\n${postValidation.errors.join('\n')}`)
    }
  } catch (error) {
    for (const backup of backups.reverse()) {
      if (existsSync(backup.backupPath)) {
        await copyFile(backup.backupPath, backup.filePath)
      }
    }
    throw error
  } finally {
    await rm(backupDir, { recursive: true, force: true })
  }
}

function printCheck(result) {
  if (result.ok) {
    console.log('Version check passed.')
    return
  }

  console.error('Version check failed:')
  for (const error of result.errors) console.error(`- ${error}`)
}

function printDryRun({ target, version, nextVersionCode, state, changes, warnings, currentValidation }) {
  console.log(`target: ${target}`)
  console.log(`current version:`)
  console.log(`  frontend: ${state.versionJson.frontend}`)
  console.log(`  windows: ${state.versionJson.windows}`)
  console.log(`  android: ${state.versionJson.android.versionName}`)
  console.log(`new version: ${version}`)
  if (target === 'android' || target === 'all') {
    console.log(`current versionCode: ${state.versionJson.android.versionCode}`)
    console.log(`new versionCode: ${nextVersionCode}`)
  }
  console.log('update files:')
  for (const change of changes) {
    console.log(`  - ${relative(change.filePath)} (${change.fields.join(', ')})`)
  }
  if (changes.length === 0) console.log('  - none')
  console.log('warnings:')
  for (const warning of warnings) console.log(`  - ${warning}`)
  if (warnings.length === 0) console.log('  - none')
  console.log(`current check: ${currentValidation.ok ? 'passed' : 'failed'}`)
}

function singleXmlValue(text, tag, filePath) {
  const matches = [...text.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))]
  if (matches.length !== 1) {
    throw new Error(`${relative(filePath)} must contain exactly one <${tag}> field. Found: ${matches.length}`)
  }
  return matches[0][1]
}

function replaceXmlValue(text, tag, value, filePath) {
  singleXmlValue(text, tag, filePath)
  return text.replace(new RegExp(`(<${tag}>)([^<]+)(</${tag}>)`), `$1${value}$3`)
}

function singleGradleValue(text, field, pattern) {
  const matches = [...text.matchAll(pattern)]
  if (matches.length !== 1) {
    throw new Error(`Android Gradle file must contain exactly one ${field}. Found: ${matches.length}`)
  }
  return matches[0][1]
}

function replaceSingle(text, pattern, replacement, filePath, field) {
  const matches = [...text.matchAll(pattern)]
  if (matches.length !== 1) {
    throw new Error(`${relative(filePath)} must contain exactly one ${field}. Found: ${matches.length}`)
  }
  return text.replace(pattern, replacement)
}

function isSemver(value) {
  return typeof value === 'string' && semverPattern.test(value)
}

function compareSemver(a, b) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

function assertNotDowngrade(label, current, next) {
  if (compareSemver(next, current) < 0) {
    throw new Error(`${label} downgrade is not allowed: ${current} -> ${next}`)
  }
}

function toFileVersion(version) {
  const [major, minor, patch] = version.split('.')
  return `${major}.${minor}.${patch}.0`
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/')
}
