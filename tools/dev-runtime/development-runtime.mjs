import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative } from 'node:path'
import {
  loadMasterDataFromDirectory,
  loadWorkoutSessionsFromDirectory,
} from '@workout-lab/workout-data/node'

const repoRoot = process.cwd()
const masterDirectory = join(repoRoot, 'data', 'master')
const workoutsDirectory = join(repoRoot, 'data', 'workouts')
const versionFile = join(repoRoot, 'src', 'version.json')
const port = Number(process.env.DEVELOPMENT_RUNTIME_PORT ?? 5180)
const recoveryRoutePrefix = '/api/v1/common/recovery/resources'
const recoveryDraftDirectory = join(tmpdir(), `atlament-dev-recovery-${sha256Hex(repoRoot)}`)
const recoveryErrorCodes = new Set([
  'RECOVERY_RESOURCE_NOT_FOUND',
  'RECOVERY_RESOURCE_NOT_BROKEN',
  'RECOVERY_UNAVAILABLE',
  'RECOVERY_SOURCE_UNAVAILABLE',
  'RECOVERY_SOURCE_VIEW_TOO_LARGE',
  'RECOVERY_SCHEMA_UNSUPPORTED',
  'RECOVERY_DRAFT_REQUIRED',
  'RECOVERY_DRAFT_CONFLICT',
  'RECOVERY_DRAFT_STALE',
  'RECOVERY_DRAFT_INCOMPATIBLE',
  'RECOVERY_DRAFT_CORRUPTED',
  'RECOVERY_DRAFT_SAVE_FAILED',
  'RECOVERY_VALIDATION_FAILED',
  'RECOVERY_WRITE_CONFLICT',
  'RECOVERY_WRITE_FAILED',
  'RECOVERY_REFLECTION_FAILED',
])

const apiRoutes = new Set([
  '/api/v1/common/status',
  '/api/v1/common/master-write/boundary',
  '/api/v1/common/master-write/unresolved',
  '/api/v1/common/master-write/documents/MACHINE_MASTER',
  '/api/v1/common/master-write/documents/GYM_MASTER',
  '/api/v1/common/runtime/workouts',
  '/api/workout-data',
])

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (!apiRoutes.has(url.pathname) && !url.pathname.startsWith(recoveryRoutePrefix)) {
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

    if (url.pathname.endsWith('/master-write/boundary')) {
      await respondMasterWriteBoundary(response)
      return
    }

    if (url.pathname.endsWith('/master-write/unresolved')) {
      await respondUnresolvedMasterReferences(response)
      return
    }

    if (url.pathname.includes('/master-write/documents/')) {
      await respondMasterDocument(request, response, url.pathname)
      return
    }

    if (url.pathname.startsWith(recoveryRoutePrefix)) {
      await respondRecovery(request, response, url.pathname)
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
  console.log('  GET /api/v1/common/master-write/boundary')
  console.log('  GET /api/v1/common/master-write/unresolved')
  console.log('  GET|PUT /api/v1/common/master-write/documents/MACHINE_MASTER')
  console.log('  GET|PUT /api/v1/common/master-write/documents/GYM_MASTER')
  console.log('  GET|POST|PUT|DELETE /api/v1/common/recovery/resources/{resourceKey}/draft')
  console.log('  GET /api/v1/common/recovery/resources')
  console.log('  GET /api/v1/common/recovery/resources/{resourceKey}')
  console.log('  GET /api/v1/common/recovery/resources/{resourceKey}/source')
  console.log('  POST /api/v1/common/recovery/resources/{resourceKey}/validate')
  console.log('  POST /api/v1/common/recovery/resources/{resourceKey}/commit (unsupported)')
  console.log('  GET /api/v1/common/runtime/workouts')
  console.log('  GET /api/workout-data')
})

async function respondStatus(response) {
  const runtime = await loadRuntimeWorkoutData()
  const versions = await loadVersions()
  const runtimeAvailable = runtime.success
  const runtimeDegraded = runtimeAvailable && runtime.errors.length > 0

  writeJson(response, 200, ok({
    versions,
    readiness: readinessJson({
      applicationStatus: runtimeDegraded || !runtimeAvailable ? 'degraded' : 'ready',
      acceptingRequests: true,
      configurationStatus: 'unknown',
      credentialStatus: 'unknown',
      githubStatus: 'unknown',
      runtimeDataStatus: runtimeDegraded ? 'degraded' : runtimeAvailable ? 'available' : 'unavailable',
      requiredActions: runtimeAvailable ? [] : ['RUNTIME_DATA_REQUIRED'],
    }),
    runtimeData: {
      currentAvailable: runtimeAvailable,
      currentGeneratedAt: null,
      latestRemoteRetrieval: 'skipped',
      latestValidation: runtimeAvailable ? 'succeeded' : 'failed',
      fallbackActive: false,
      quarantinedWorkoutResourceCount: countQuarantinedWorkoutResources(runtime.errors),
    },
    recovery: {
      brokenResourceCount: countQuarantinedWorkoutResources(runtime.errors),
      brokenWorkoutResourceCount: countQuarantinedWorkoutResources(runtime.errors),
      brokenMasterResourceCount: 0,
      recoverableResourceCount: countQuarantinedWorkoutResources(runtime.errors),
      activeDraftCount: await activeRecoveryDraftCount(),
    },
    application: {
      status: runtimeDegraded || !runtimeAvailable ? 'degraded' : 'ready',
      degraded: runtimeDegraded || !runtimeAvailable,
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
      runtimeData: runtimeDegraded ? 'degraded' : runtimeAvailable ? 'available' : 'unavailable',
      hosting: {
        portal: 'unknown',
        dashboard: 'unknown',
        workouts: 'unknown',
        machines: 'unknown',
        analytics: 'unknown',
        settings: 'unknown',
        maintenance: 'unknown',
      },
    },
    requiredActions: runtimeAvailable ? [] : ['RUNTIME_DATA_REQUIRED'],
  }, runtime.errors, runtime.warnings))
}

function countQuarantinedWorkoutResources(errors) {
  return new Set((errors ?? [])
    .map((error) => String(error.message ?? '').split(':')[0].trim())
    .filter((path) => path.endsWith('.json') || path.endsWith('.jsonl'))).size
}

async function activeRecoveryDraftCount() {
  try {
    const entries = await readdir(recoveryDraftDirectory, { withFileTypes: true })
    let count = 0
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const draft = JSON.parse(await readFile(join(recoveryDraftDirectory, entry.name), 'utf8'))
      if (draft?.schemaVersion === 1) count += 1
    }
    return count
  } catch {
    return 0
  }
}

function readinessJson(status) {
  const requiredActions = Array.from(new Set(status.requiredActions)).sort()
  const unavailableComponents = [
    status.configurationStatus === 'unavailable' ? 'configuration' : '',
    status.credentialStatus === 'unavailable' ? 'credential' : '',
    status.runtimeDataStatus === 'unavailable' ? 'runtimeData' : '',
  ].filter(Boolean)
  const degradedComponents = [
    status.githubStatus === 'degraded' ? 'github' : '',
    status.runtimeDataStatus === 'degraded' ? 'runtimeData' : '',
  ].filter(Boolean)

  let state = 'ready'
  if (requiredActions.includes('CONFIGURATION_REQUIRED') || requiredActions.includes('CREDENTIAL_REQUIRED')) {
    state = 'unconfigured'
  } else if (!status.acceptingRequests || status.applicationStatus === 'failed' || unavailableComponents.includes('runtimeData')) {
    state = 'unavailable'
  } else if (status.applicationStatus === 'degraded' || degradedComponents.length > 0 || unavailableComponents.length > 0 || requiredActions.length > 0) {
    state = 'degraded'
  }

  return {
    state,
    requiredActions,
    unavailableComponents,
    degradedComponents,
  }
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

  writeJson(response, 200, ok({ sessions: runtime.sessions }, runtime.errors, runtime.warnings))
}

async function respondMasterDocument(request, response, path) {
  const type = path.endsWith('/MACHINE_MASTER') ? 'MACHINE_MASTER' : 'GYM_MASTER'
  const documentPath = type === 'MACHINE_MASTER'
    ? join(masterDirectory, 'machines.json')
    : join(masterDirectory, 'gyms.json')
  if (request.method === 'GET') {
    writeJson(response, 200, ok({
      type,
      path: type === 'MACHINE_MASTER' ? 'master/machines.json' : 'master/gyms.json',
      revision: await localRevision(documentPath),
      content: await readFile(documentPath, 'utf8'),
    }))
    return
  }

  if (request.method !== 'PUT') {
    writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only GET and PUT are supported.', true))
    return
  }

  const payload = JSON.parse(await readRequestBody(request))
  const currentRevision = await localRevision(documentPath)
  if (payload.expectedRevision !== currentRevision) {
    writeJson(response, 409, fail('MASTER_SYNC_REQUIRED', 'Master document must be synchronized before saving.', true))
    return
  }

  const currentContent = await readFile(documentPath, 'utf8')
  const validationErrors = await validateCandidateMasterWrite(type, currentContent, payload.content)
  if (validationErrors.length > 0) {
    writeJson(response, 400, failMany(validationErrors))
    return
  }

  await writeFile(documentPath, payload.content, 'utf8')
  writeJson(response, 200, ok({
    type,
    path: type === 'MACHINE_MASTER' ? 'master/machines.json' : 'master/gyms.json',
    revision: await localRevision(documentPath),
  }))
}

async function validateCandidateMasterWrite(type, currentContent, nextContent) {
  if (typeof nextContent !== 'string' || nextContent.trim() === '') {
    return [toError('MASTER_WRITE_INVALID', new Error('Master document write request is invalid.'), 'Master document write request is invalid.')]
  }

  if (type === 'GYM_MASTER' && hasMainGym(currentContent) && !hasMainGym(nextContent)) {
    return [toError('MASTER_WRITE_INVALID', new Error('Configured Main Gym cannot be cleared.'), 'Configured Main Gym cannot be cleared.')]
  }

  const tempRoot = await mkdtemp(join(tmpdir(), 'atlament-dev-master-'))
  try {
    const tempMaster = join(tempRoot, 'master')
    await mkdir(tempMaster, { recursive: true })
    const machinesContent = type === 'MACHINE_MASTER'
      ? nextContent
      : await readFile(join(masterDirectory, 'machines.json'), 'utf8')
    const gymsContent = type === 'GYM_MASTER'
      ? nextContent
      : await readFile(join(masterDirectory, 'gyms.json'), 'utf8')
    await writeFile(join(tempMaster, 'machines.json'), machinesContent, 'utf8')
    await writeFile(join(tempMaster, 'gyms.json'), gymsContent, 'utf8')

    const masterResult = await loadMasterDataFromDirectory(tempMaster)
    if (!masterResult.masterData || masterResult.issues.length > 0) {
      return masterResult.issues.map((issue) => ({
        code: 'MASTER_WRITE_INVALID',
        message: issue.message,
        recoverable: false,
      }))
    }

    const workoutResult = await loadWorkoutSessionsFromDirectory(workoutsDirectory, masterResult.masterData)
    return workoutResult.issues.map(toAfError)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

function hasMainGym(content) {
  try {
    const gyms = JSON.parse(content).gyms ?? []
    return gyms.some((gym) => gym?.main === true)
  } catch {
    return false
  }
}

async function localRevision(path) {
  const current = await stat(path)
  return `${current.size}-${Math.trunc(current.mtimeMs)}`
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

async function respondMasterWriteBoundary(response) {
  writeJson(response, 200, ok({
    repository: {
      owner: '',
      repository: '',
      ref: 'main',
      rootPath: '',
    },
    allowedTargets: [
      { type: 'MACHINE_MASTER', path: 'master/machines.json', resourceKind: 'file', writeAllowed: true },
      { type: 'GYM_MASTER', path: 'master/gyms.json', resourceKind: 'file', writeAllowed: true },
    ],
    security: {
      configurationAvailable: false,
      credentialConfigured: false,
      credentialState: 'unknown',
      repositoryConfigured: false,
      writeEnabled: false,
      workoutLogWriteAllowed: false,
      rawJsonWriteAllowed: false,
      genericGitWriteAllowed: false,
    },
  }))
}

async function respondUnresolvedMasterReferences(response) {
  const runtime = await loadRuntimeWorkoutData()
  const groups = new Map()
  for (const warning of runtime.warnings) {
    const isMachine = warning.referenceKind === 'machine'
    const type = isMachine ? 'MACHINE_MASTER' : 'GYM_MASTER'
    const referenceId = warning.originalId
    const key = `${type}:${referenceId}`
    const affected = groups.get(key) ?? {
      type,
      referenceId,
      affectedWorkouts: [],
    }
    affected.affectedWorkouts.push({
      filePath: warning.filePath ?? '',
      line: warning.line ?? null,
      message: warning.message,
    })
    groups.set(key, affected)
  }

  writeJson(response, 200, ok(Array.from(groups.values()).sort((a, b) =>
    a.type.localeCompare(b.type) || a.referenceId.localeCompare(b.referenceId),
  )))
}

async function respondRecovery(request, response, path) {
  const context = await loadRecoveryContext()
  const suffix = path.slice(recoveryRoutePrefix.length).replace(/^\/+/, '')
  const parts = suffix.length === 0 ? [] : suffix.split('/')

  if (parts.length === 0) {
    if (request.method !== 'GET') {
      writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only GET is supported.', true))
      return
    }

    writeJson(response, 200, ok(await listBrokenRecoveryResources(context)))
    return
  }

  const resourceKey = decodeURIComponent(parts[0])
  const resource = await resolveRecoveryResource(context, resourceKey)
  if (!resource) {
    writeJson(response, 404, fail('RECOVERY_RESOURCE_NOT_FOUND', 'Recovery Resource was not found.', true))
    return
  }

  if (parts.length === 1) {
    if (request.method !== 'GET') {
      writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only GET is supported.', true))
      return
    }

    const draft = await loadRecoveryDraft(resource.source.path, resource.source.revision)
    writeJson(response, 200, ok({
      resourceKey,
      inspection: resource.inspection,
      eligibility: {
        eligible: resource.inspection.health === 'broken',
        reasonCode: resource.inspection.health === 'broken' ? null : 'RECOVERY_RESOURCE_NOT_BROKEN',
      },
      capabilities: {
        sourceView: true,
        draft: resource.inspection.health === 'broken',
        validate: resource.inspection.health === 'broken',
        commit: false,
      },
      draft,
    }))
    return
  }

  if (parts[1] === 'source') {
    if (request.method !== 'GET') {
      writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only GET is supported.', true))
      return
    }

    if (Buffer.byteLength(resource.source.content, 'utf8') > 256 * 1024) {
      writeJson(response, 413, fail('RECOVERY_SOURCE_VIEW_TOO_LARGE', 'Recovery source view is too large.', true))
      return
    }

    writeJson(response, 200, ok({
      resourceKey,
      path: resource.source.path,
      revision: resource.source.revision,
      resourceType: 'WORKOUT',
      content: resource.source.content,
      readOnly: true,
    }))
    return
  }

  if (parts[1] === 'draft') {
    await respondRecoveryDraft(request, response, resource)
    return
  }

  if (parts[1] === 'validate') {
    if (request.method !== 'POST') {
      writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only POST is supported.', true))
      return
    }

    await respondRecoveryValidation(response, context, resource)
    return
  }

  if (parts[1] === 'commit') {
    const payload = request.method === 'POST' ? JSON.parse(await readRequestBody(request) || '{}') : {}
    payload.expectedSourceRevision
    payload.expectedDraftRevision
    writeJson(response, 503, fail('RECOVERY_UNAVAILABLE', 'Development Runtime does not perform Recovery Git commits.', true))
    return
  }

  writeJson(response, 404, fail('COMMON_NOT_FOUND', 'Development Runtime API route is not found.', true))
}

async function respondRecoveryDraft(request, response, resource) {
  if (request.method === 'GET') {
    writeJson(response, 200, ok(await loadRecoveryDraft(resource.source.path, resource.source.revision)))
    return
  }

  if (request.method === 'DELETE') {
    await rm(recoveryDraftPath(resource.source.path, resource.source.revision), { force: true })
    writeJson(response, 200, ok({ state: 'none', draft: null }))
    return
  }

  if (request.method === 'POST') {
    if (resource.inspection.health !== 'broken') {
      writeJson(response, 409, fail('RECOVERY_RESOURCE_NOT_BROKEN', 'Recovery Draft requires a Broken Resource.', true))
      return
    }

    const existing = await loadRecoveryDraft(resource.source.path, resource.source.revision)
    if (existing.state === 'active') {
      writeJson(response, 200, ok(existing))
      return
    }

    const draft = {
      schemaVersion: 1,
      sourcePath: resource.source.path,
      sourceRevision: resource.source.revision,
      resourceType: 'WORKOUT',
      inspectionVersion: 1,
      draftRevision: 1,
      fields: extractRecoveryFields(resource.source.path, resource.source.content),
      suggestions: [],
    }
    await saveRecoveryDraft(draft)
    writeJson(response, 200, ok({ state: 'active', draft }))
    return
  }

  if (request.method === 'PUT') {
    const existing = await loadRecoveryDraft(resource.source.path, resource.source.revision)
    if (existing.state !== 'active' || !existing.draft) {
      writeJson(response, 409, fail('RECOVERY_DRAFT_REQUIRED', 'Recovery Draft is required.', true))
      return
    }

    const update = JSON.parse(await readRequestBody(request))
    if (update.expectedDraftRevision !== existing.draft.draftRevision) {
      writeJson(response, 409, fail('RECOVERY_DRAFT_CONFLICT', 'Recovery Draft was updated elsewhere.', true))
      return
    }

    const draft = {
      ...existing.draft,
      draftRevision: existing.draft.draftRevision + 1,
      fields: Array.isArray(update.fields) ? update.fields : existing.draft.fields,
    }
    await saveRecoveryDraft(draft)
    writeJson(response, 200, ok({ state: 'active', draft }))
    return
  }

  writeJson(response, 405, fail('METHOD_NOT_ALLOWED', 'Only GET, POST, PUT and DELETE are supported.', true))
}

async function respondRecoveryValidation(response, context, resource) {
  const snapshot = await loadRecoveryDraft(resource.source.path, resource.source.revision)
  if (snapshot.state !== 'active' || !snapshot.draft) {
    writeJson(response, 409, fail('RECOVERY_DRAFT_REQUIRED', 'Recovery Draft is required.', true))
    return
  }

  const unresolved = snapshot.draft.fields
    .filter((field) => field?.state === 'unresolved')
    .map((field) => ({
      code: 'RECOVERY_FIELD_UNRESOLVED',
      severity: 'broken',
      message: 'Recovery field is unresolved.',
      location: { line: null, recordId: null, sessionId: null, fieldPath: field.fieldPath ?? null },
      details: null,
    }))
  if (unresolved.length > 0) {
    writeJson(response, 200, ok({
      sourceRevision: snapshot.draft.sourceRevision,
      draftRevision: snapshot.draft.draftRevision,
      health: 'broken',
      issues: unresolved,
      commitAllowed: false,
      replacementPath: snapshot.draft.sourcePath,
      replacementContent: null,
      changeSummary: [],
      pathChange: null,
    }))
    return
  }

  if (!context.masterData) {
    writeJson(response, 200, ok({
      sourceRevision: snapshot.draft.sourceRevision,
      draftRevision: snapshot.draft.draftRevision,
      health: 'broken',
      issues: context.masterIssues.map((error) => ({
        code: error.code,
        severity: 'broken',
        message: error.message,
        location: null,
        details: null,
      })),
      commitAllowed: false,
      replacementPath: snapshot.draft.sourcePath,
      replacementContent: null,
      changeSummary: [],
      pathChange: null,
    }))
    return
  }

  const replacementContent = buildRecoveryCandidate(snapshot.draft)
  const candidate = { ...resource.source, content: replacementContent }
  const candidateBuild = await buildSingleWorkout(candidate, context.masterData)
  const otherBuilds = await Promise.all(context.sources
    .filter((source) => source.path !== resource.source.path)
    .map((source) => buildSingleWorkout(source, context.masterData)))
  const otherSessionIds = new Set(otherBuilds.flatMap((build) => build.sessions.map((session) => session.sessionId)))
  const issues = [
    ...candidateBuild.errors.map((error) => ({
      code: error.code,
      severity: 'broken',
      message: error.message,
      location: null,
      details: null,
    })),
    ...candidateBuild.warnings.map(resourceIssueFromWarning),
    ...candidateBuild.sessions
      .filter((session) => otherSessionIds.has(session.sessionId))
      .map((session) => ({
        code: 'RECOVERY_DUPLICATE_SESSION_ID',
        severity: 'broken',
        message: `Duplicate session_id: ${session.sessionId}.`,
        location: { line: null, recordId: null, sessionId: session.sessionId, fieldPath: '/session_id' },
        details: null,
      })),
  ]
  const health = issues.some((issue) => issue.severity === 'broken') ? 'broken' : issues.length > 0 ? 'degraded' : 'healthy'
  writeJson(response, 200, ok({
    sourceRevision: snapshot.draft.sourceRevision,
    draftRevision: snapshot.draft.draftRevision,
    health,
    issues,
    commitAllowed: health === 'healthy' || health === 'degraded',
    replacementPath: snapshot.draft.sourcePath,
    replacementContent,
    changeSummary: ['replacement candidate generated'],
    pathChange: null,
  }))
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
      warnings: [],
    }
  }

  const workoutResult = await loadWorkoutSessionsFromDirectory(workoutsDirectory, masterResult.masterData)
  const errors = workoutResult.issues.map(toAfError)

  return {
    success: true,
    sessions: workoutResult.sessions,
    errors,
    warnings: workoutResult.warnings ?? [],
  }
}

async function loadRecoveryContext() {
  const masterResult = await loadMasterDataFromDirectory(masterDirectory)
  const sources = await collectWorkoutSources()
  const runtime = masterResult.masterData
    ? await loadRuntimeWorkoutData()
    : { success: false, sessions: [], errors: masterResult.issues.map(toAfError), warnings: [] }
  return {
    sources,
    masterData: masterResult.masterData,
    masterIssues: masterResult.issues.map(toAfError),
    runtime,
  }
}

async function collectWorkoutSources() {
  const files = await collectWorkoutFiles(workoutsDirectory)
  return Promise.all(files.map(async (filePath) => ({
    path: normalizePath(relative(join(repoRoot, 'data'), filePath)),
    content: await readFile(filePath, 'utf8'),
    revision: await localRevision(filePath),
  })))
}

async function listBrokenRecoveryResources(context) {
  const resources = await Promise.all(context.sources.map((source) => inspectRecoveryResource(context, source)))
  return Promise.all(resources
    .filter((resource) => resource.inspection.health === 'broken')
    .sort((left, right) => left.source.path.localeCompare(right.source.path))
    .map(async (resource) => ({
      resourceKey: resource.resourceKey,
      path: resource.source.path,
      revision: resource.source.revision,
      resourceType: 'WORKOUT',
      health: 'broken',
      issues: resource.inspection.issues,
      recoveryEligible: true,
      hasDraft: (await loadRecoveryDraft(resource.source.path, resource.source.revision)).state === 'active',
    })))
}

async function resolveRecoveryResource(context, resourceKey) {
  for (const source of context.sources) {
    const resource = await inspectRecoveryResource(context, source)
    if (resource.resourceKey === resourceKey) return resource
  }
  return null
}

async function inspectRecoveryResource(context, source) {
  const build = context.masterData
    ? await buildSingleWorkout(source, context.masterData)
    : { sessions: [], errors: context.masterIssues, warnings: [] }
  const issues = [
    ...build.errors.map((error) => ({
      code: error.code,
      severity: 'broken',
      message: error.message,
      location: null,
      details: null,
    })),
    ...build.warnings.map(resourceIssueFromWarning),
  ]
  const health = issues.some((issue) => issue.severity === 'broken') ? 'broken' : issues.length > 0 ? 'degraded' : 'healthy'
  return {
    source,
    resourceKey: recoveryResourceKey(source.path, source.revision),
    inspection: {
      path: source.path,
      revision: source.revision,
      resourceType: 'WORKOUT',
      inspectionVersion: 1,
      health,
      issues,
    },
  }
}

async function buildSingleWorkout(source, masterData) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'atlament-dev-recovery-build-'))
  try {
    const workoutRoot = join(tempRoot, 'workouts')
    const relativeWorkoutPath = source.path.startsWith('workouts/')
      ? source.path.slice('workouts/'.length)
      : source.path
    const target = join(workoutRoot, relativeWorkoutPath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, source.content, 'utf8')
    const result = await loadWorkoutSessionsFromDirectory(workoutRoot, masterData)
    return {
      sessions: result.sessions ?? [],
      errors: (result.issues ?? []).map(toAfError),
      warnings: result.warnings ?? [],
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

function resourceIssueFromWarning(warning) {
  return {
    code: warning.code,
    severity: 'warning',
    message: warning.message,
    location: {
      line: warning.line ?? null,
      recordId: null,
      sessionId: warning.sessionId ?? null,
      fieldPath: null,
    },
    details: {
      referenceKind: warning.referenceKind,
      resolutionState: warning.resolutionState,
      originalId: warning.originalId,
      resolvedId: warning.resolvedId ?? null,
    },
  }
}

async function loadRecoveryDraft(sourcePath, sourceRevision) {
  try {
    const draft = JSON.parse(await readFile(recoveryDraftPath(sourcePath, sourceRevision), 'utf8'))
    return draft?.schemaVersion === 1
      ? { state: 'active', draft }
      : { state: 'incompatible', draft: null }
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'none', draft: null }
    return { state: 'corrupted', draft: null }
  }
}

async function saveRecoveryDraft(draft) {
  await mkdir(recoveryDraftDirectory, { recursive: true })
  await writeFile(recoveryDraftPath(draft.sourcePath, draft.sourceRevision), JSON.stringify(draft, null, 2), 'utf8')
}

function recoveryDraftPath(sourcePath, sourceRevision) {
  return join(recoveryDraftDirectory, `${sha256Hex(`${sourcePath}|${sourceRevision}`)}.json`)
}

function extractRecoveryFields(path, content) {
  const lines = content.split(/\r?\n/).map((line, index) => ({ line, index })).filter(({ line }) => line.trim() !== '')
  if (path.toLowerCase().endsWith('.jsonl')) {
    return lines.flatMap(({ line, index }) => extractObjectFields(parseJsonObject(line), `/sessions/${index}`))
  }

  return extractObjectFields(parseJsonObject(content), '')
}

function extractObjectFields(source, prefix) {
  if (!source || Array.isArray(source) || typeof source !== 'object') {
    return ['/schema_version', '/session_id', '/date', '/status', '/gym_id', '/condition', '/machines', '/notes']
      .map((fieldPath) => unresolvedField(prefix + fieldPath))
  }

  return [
    recoverableField(source, `${prefix}/schema_version`, 'schema_version', 'number'),
    recoverableField(source, `${prefix}/session_id`, 'session_id', 'string'),
    recoverableField(source, `${prefix}/date`, 'date', 'string'),
    recoverableField(source, `${prefix}/status`, 'status', 'string'),
    recoverableField(source, `${prefix}/gym_id`, 'gym_id', 'string'),
    recoverableField(source, `${prefix}/condition`, 'condition', 'object', true),
    recoverableField(source, `${prefix}/machines`, 'machines', 'array'),
    recoverableField(source, `${prefix}/notes`, 'notes', 'array', true),
  ]
}

function recoverableField(source, fieldPath, key, kind, optional = false) {
  if (!(key in source)) return optional ? recoveredField(fieldPath, null) : unresolvedField(fieldPath)
  const value = source[key]
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
  return actual === kind || (optional && key === 'condition' && actual === 'null')
    ? recoveredField(fieldPath, value)
    : unresolvedField(fieldPath)
}

function recoveredField(fieldPath, value) {
  return { fieldPath, state: 'recovered', source: 'original', value }
}

function unresolvedField(fieldPath) {
  return { fieldPath, state: 'unresolved', source: 'original' }
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function buildRecoveryCandidate(draft) {
  const fields = draft.fields.filter((field) => ['recovered', 'confirmed'].includes(field.state) && 'value' in field)
  const jsonlPrefixes = Array.from(new Set(fields
    .map((field) => /^\/sessions\/([^/]+)\//.exec(field.fieldPath)?.[1])
    .filter(Boolean)))
  if (jsonlPrefixes.length > 0) {
    return jsonlPrefixes
      .sort((left, right) => Number(left) - Number(right))
      .map((index) => JSON.stringify(objectFromFields(fields, `/sessions/${index}`)))
      .join('\n') + '\n'
  }

  return JSON.stringify(objectFromFields(fields, ''), null, 2) + '\n'
}

function objectFromFields(fields, prefix) {
  const result = {}
  for (const field of fields.sort((left, right) => left.fieldPath.localeCompare(right.fieldPath))) {
    const key = prefix.length === 0
      ? field.fieldPath.replace(/^\//, '')
      : field.fieldPath.slice(prefix.length + 1)
    if (!key || key.includes('/')) continue
    result[key] = field.value
  }
  return result
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

function ok(data, errors = [], warnings = []) {
  return {
    success: true,
    errors,
    warnings,
    data,
  }
}

function fail(code, message, recoverable) {
  return {
    success: false,
    errors: [{ code, message, recoverable }],
    warnings: [],
    data: null,
  }
}

function failMany(errors) {
  return {
    success: false,
    errors,
    warnings: [],
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

function recoveryResourceKey(sourcePath, sourceRevision) {
  return base64Url(createHash('sha256')
    .update(['dev', repoRoot, 'WORKOUT', sourcePath, sourceRevision].join('|'))
    .digest())
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function base64Url(buffer) {
  return buffer.toString('base64').replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
}
