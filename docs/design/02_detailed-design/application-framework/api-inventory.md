# Application Framework Localhost API Inventory

Phase0-B inventory result for the current v2.0.0 release line.

## Scope

Inventory target:

- Windows AF: `src/application/windows/Host/AfHttpHost.cs`
- Android AF: `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt`
- Node development runtime: `tools/dev-runtime/development-runtime.mjs`
- Shared frontend clients:
  - `src/shared/frontend-common/src/index.ts`
  - `src/shared/frontend-common/src/af-client.js`
  - `src/shared/workout-data/src/index.ts`
- Frontend consumers:
  - `src/frontend/portal/src/main.js`
  - `src/frontend/settings-solid/src/App.tsx`
  - workout domain apps through `@workout-lab/workout-data`

## Endpoint Inventory

| Endpoint | Producer | Consumer | Decision |
|---|---|---|---|
| `GET /api/v1/common/status` | Windows, Android, Node dev runtime | Portal status gate, Settings status panel, AF tests | Keep |
| `GET /api/v1/common/runtime/workouts` | Windows, Android, Node dev runtime | `@workout-lab/workout-data` runtime loader used by dashboard/workouts/machines/analytics | Keep |
| `POST /api/v1/common/sync` | Windows, Android | Settings manual sync | Keep |
| `GET /api/v1/common/configuration` | Windows, Android | Settings configuration form | Keep |
| `POST /api/v1/common/configuration` | Windows, Android | Settings repository/resource/timeout save actions | Keep |
| `GET /api/v1/common/credential/status` | Windows, Android | Settings credential panel | Keep |
| `POST /api/v1/common/credential` | Windows, Android | Settings credential save action | Keep |
| `POST /api/v1/common/shutdown` | Windows, Android | Native/application lifecycle control endpoint | Keep |
| `/api/common/*` | Former Windows, Android, Node dev runtime alias | No current frontend client or runtime loader | Remove |
| `GET /api/workout-data` | Node dev/runtime preview tooling only | `@workout-lab/workout-data` fallback and Vite/preview dev tooling | Keep as dev-only legacy data endpoint outside native AF contract |

## Response Field Inventory

### Common Envelope

`success`, `errors`, `warnings`, and `data` are consumed by shared clients and Settings error handling. `errors[].code`, `errors[].message`, and `errors[].recoverable` are retained as the shared error contract. Runtime Master reference warnings use `warnings[]` so unresolved Master references do not imply request failure or fallback.

### Status Data

Retained fields:

- `versions.applicationFramework`: Settings display and AF version source.
- `versions.frontendFramework`: Settings display.
- `versions.nativePackages.windows.version`: Settings display for Windows package version.
- `versions.nativePackages.android.versionName`: Settings display for Android package version.
- `versions.nativePackages.android.versionCode`: Settings display for Android package code.
- `readiness.state`, `readiness.requiredActions`, `readiness.unavailableComponents`, `readiness.degradedComponents`: shared setup/readiness/runtime state contract for frontend gating.
- `runtimeData.currentAvailable`, `runtimeData.currentGeneratedAt`, `runtimeData.latestRemoteRetrieval`, `runtimeData.latestValidation`, `runtimeData.fallbackActive`: minimum runtime-data freshness and fallback facts for shared recovery policy.
- `application.status`, `application.degraded`, `application.acceptingRequests`: AF diagnostic/status contract and native test harness.
- `operations.startup`: Portal startup/runtime gate and AF test harness.
- `operations.manualSync`: Portal manual sync state display.
- `operations.configurationUpdate`, `operations.credentialUpdate`, `operations.shutdown`: AF diagnostic/status contract.
- `components.github`: Portal and Settings GitHub state display.
- `components.runtimeData`: Portal runtime availability display.
- `components.configuration`, `components.credential`, `components.hosting`: AF diagnostic/status contract.
- `requiredActions`: Portal runtime/setup gate and AF tests.

### Configuration Update Data

Retained field:

- `remoteChecked`: Settings message branch after repository/resource changes.

Removed field:

- `saved`: no current frontend, native control, or test consumer. Success is already represented by the common envelope `success`.

### Sync Data

Retained field:

- `degraded`: Settings manual sync message branch when remote sync falls back to local runtime data.

Removed fields:

- `source`: no current frontend, native control, or test consumer.
- `updated`: no current frontend, native control, or test consumer. Success is already represented by the common envelope `success`.

## Drift Cleanup

Windows, Android, and Node development runtime now expose the same current prefix for shared endpoints:

```text
/api/v1/common
```

The legacy `/api/common/*` alias is removed from producers and documentation. Unknown `/api/*` routes continue to return an API error instead of frontend HTML.

## Phase3 Contract Refinement

`GET /api/v1/common/status` no longer publishes top-level `version`. The value duplicated `versions.applicationFramework`; Windows, Android, Node development runtime, and Settings now use `versions.applicationFramework` as the single AF version field.

## Phase4 Read Information Extension

`GET /api/v1/common/status` now publishes native package metadata under `versions.nativePackages`. This adds only package version information already held by platform build metadata or the shipped `version.json`; component status and data freshness fields were not added because Phase3 status already represents the existing component states and no lightweight cross-platform last-successful-sync persistence exists yet.

## Phase8-A Readiness Model

`GET /api/v1/common/status` now publishes `readiness` as the shared application readiness model. Frontends should consume this domain state instead of deriving setup/runtime failure independently. Main Gym unconfigured state is intentionally excluded from readiness and remains a feature-level optional context.

## Phase8-C Access and Recovery

Shared frontend clients derive Application Access Policy from `readiness`. `unconfigured` blocks normal applications while keeping Settings/Setup recovery available. `ready` allows normal applications. `degraded` keeps normal applications available and restricts only affected components. `unavailable` blocks unsafe normal application access and exposes recovery actions such as Settings, credential update, retry sync, or reload.

Configured credential failures are runtime failures rather than setup absence. Remote fetch failure with existing Runtime Data remains a degraded fallback state: GitHub is degraded, Runtime Data stays available, and normal applications may continue using the previous successful data.

## Phase8-D Unified Status and Credential Lifecycle

Status keeps existing component/readiness fields and adds only `runtimeData` facts required to distinguish current data availability, latest remote retrieval, latest validation, and active fallback. Credential lifecycle remains represented by credential status (`configured`, `state`, `limitDate`) plus the credential component state; configured-but-expired or invalid credentials are runtime degradation inputs, not setup absence.
