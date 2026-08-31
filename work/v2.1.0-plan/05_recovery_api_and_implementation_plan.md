# v2.1.0 Recovery API / Implementation Plan

## Public API

Recovery uses the existing common prefix:

```text
/api/v1/common
```

Recovery namespace:

```text
/api/v1/common/recovery
```

Public endpoints:

```text
GET    /recovery/resources
GET    /recovery/resources/{resourceKey}
GET    /recovery/resources/{resourceKey}/source
GET    /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/draft
PUT    /recovery/resources/{resourceKey}/draft
DELETE /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/validate
POST   /recovery/resources/{resourceKey}/commit
```

No generic quarantine mutation, Raw write, batch Recovery, Undo, arbitrary commit message, or generic Git path/content endpoint is exposed.

`resourceKey` is an opaque API identifier for the Resource identity. It is not a domain source of truth and clients must not decode it for business logic.

Existing `AfResponse<T>` / `AfCallResult<T>` envelope is reused.

## Conceptual DTOs

```text
BrokenResourceSummary
- resourceKey
- path
- revision
- resourceType
- issueCount
- priority
- draftState
- eligibility

RecoveryResourceDetail
- inspection
- eligibility
- draft

RecoveryDraft
- schemaVersion = 1
- sourcePath
- sourceRevision
- resourceType
- inspectionVersion
- draftRevision
- fields[]
- suggestions[]

RecoveryValidationSnapshot
- sourceRevision
- draftRevision
- health
- commitAllowed
- issues[]
- pathChange?
- summary

RecoveryCommitResult
- resourceType
- sourcePath
- resultingPath
- sourceRevision
- resultingRevision
- resultingHealth
- runtimeReflection
```

Validation that executes normally but finds a Broken candidate returns a successful operation with `commitAllowed=false`; it is not a transport/system failure.

## Draft API Rules

- Draft creation derives Recoverable Facts from the current Broken Resource; request body does not contain Raw Resource content.
- Existing active Draft is resumed rather than silently overwritten.
- Draft update uses `expectedDraftRevision`.
- Draft creation starts at `draftRevision = 1` and successful saves increment it.
- Source path/revision/resource type cannot be changed through Draft update.
- DELETE Draft is local-only and idempotent.
- Stale/incompatible/corrupted Drafts are not committable.

Suggested Draft states:

```text
none
active
stale
incompatible
corrupted
```

## Validation / Commit API Rules

Validation request references the current Draft revision. Candidate Resource content is generated inside AF/shared domain, not supplied as Raw JSON by Frontend.

Commit request conceptually carries:

```text
expectedSourceRevision
expectedDraftRevision
```

Before write, AF must recheck:

1. current source revision,
2. Draft revision,
3. relevant repository context,
4. Whole Resource Validation,
5. destination/path integrity.

Only then may it generate and write the Replacement.

## Recovery Error Codes

Stable Recovery-specific machine codes:

```text
RECOVERY_RESOURCE_NOT_FOUND
RECOVERY_RESOURCE_NOT_BROKEN
RECOVERY_UNAVAILABLE
RECOVERY_SOURCE_UNAVAILABLE
RECOVERY_SOURCE_VIEW_TOO_LARGE
RECOVERY_SCHEMA_UNSUPPORTED
RECOVERY_DRAFT_REQUIRED
RECOVERY_DRAFT_CONFLICT
RECOVERY_DRAFT_STALE
RECOVERY_DRAFT_INCOMPATIBLE
RECOVERY_DRAFT_CORRUPTED
RECOVERY_DRAFT_SAVE_FAILED
RECOVERY_WRITE_CONFLICT
RECOVERY_WRITE_FAILED
RECOVERY_REFLECTION_FAILED
```

Existing `GITHUB_*` transport/auth codes are reused. UI logic switches on machine code, never message text.

## Status Contract Extension

Conceptual Recovery status facts:

```text
RecoveryStatusFacts
- brokenResourceCount
- brokenWorkoutResourceCount
- brokenMasterResourceCount
- recoverableResourceCount
- activeDraftCount

RuntimeDataStatusFacts
- quarantinedWorkoutResourceCount
```

Workout quarantine makes readiness degraded while keeping Runtime available. It does not itself set whole-Runtime `fallbackActive`.

## Implementation Components

Conceptual responsibilities:

```text
ResourceInspector
RecoveryService
RecoveryDraftStore
RecoveryValidator
RecoveryReplacementBuilder
RecoveryGitWriter
```

- `ResourceInspector`: structured Resource inspection and Health.
- `RecoveryService`: workflow orchestration only.
- `RecoveryDraftStore`: AF-local persistence and local optimistic concurrency.
- `RecoveryValidator`: composes existing schema/domain/repository validators.
- `RecoveryReplacementBuilder`: builds normal Domain Resource and canonical serialization.
- `RecoveryGitWriter`: only Recovery component that owns Git write primitives.

Avoid a Recovery God Service containing inspection, validation, serialization, persistence, Git write, and Runtime rebuilding.

## Repository Placement

Use existing package/application boundaries.

- Shared frontend Recovery DTO/client: `src/shared/frontend-common` (prefer Recovery module exported by `index.ts`, rather than indefinitely expanding one file).
- Workout Resource inspection/quarantine: `src/shared/workout-data`.
- Reuse existing Workout types/domain schema from `workout-types` / existing shared domain packages; do not duplicate schemas for Recovery.
- Native implementations live under existing Windows and Android AF applications.
- Recovery UI lives in existing `maintenance-vue`; do not create another frontend application.
- Do not create a new shared package solely for v2.1.0 unless implementation evidence reveals a real boundary that existing packages cannot represent cleanly.

## Git Writer

Same-path replacement may reuse existing Contents API style writes when concurrency semantics are preserved.

Path relocation requires one atomic Git commit:

```text
expected current head/tree
-> create Replacement blob
-> create tree containing old-path delete + new-path create
-> create commit
-> update ref without force
```

If remote head/context changes, fail with conflict. Do not auto-rebase/merge/overwrite/force update.

## Recovery UI Components

Conceptual composition:

```text
RecoveryView
├ RecoveryResourceList
├ RecoveryResourceSummary
├ RecoveryEditor
│  ├ RecoveryIssueSummary
│  ├ RecoveryFieldRenderer
│  ├ RecoveryValidationSummary
│  └ RecoverySourceViewer
├ RecoveryConfirmDialog
└ RecoveryResult
```

Use schema/normalized-model generated field rendering as the default. Resource-specific adapters/components are allowed only where domain-specific presentation genuinely requires them.

## Required Tests

### Inspection / Runtime

- Healthy JSON.
- parse failure.
- invalid root.
- required missing.
- unknown/extra field.
- duplicate ID.
- Workout path/internal date mismatch.
- same-date resource conflict.
- unresolved/deleted Master reference remains Degraded.
- JSONL valid/broken/valid lines => entire file quarantined.
- Healthy A + Broken B + Healthy C => A/C adopted, B absent, Runtime available, readiness degraded.
- Broken Master + LKG => fallback.
- Broken Master + no LKG => unavailable.

### Draft

- create/resume.
- autosave/update.
- draftRevision conflict.
- restart restore.
- stale source.
- incompatible Draft.
- corrupted persistence.
- discard.
- explicit stale-value copy into current Draft.

### Validation / Commit

- Healthy candidate.
- Degraded candidate.
- Broken candidate.
- repository duplicate/conflict.
- path conflict.
- Draft mutation invalidates validation.
- repository-context change invalidates validation.
- same-path write success.
- path relocation is one atomic commit.
- no Broken intermediate commit.
- source/context conflict.
- ambiguous write reconciliation.
- auth/permission failure.
- reflection failure after Git success.
- double-submit does not create duplicate commits.

### Contract parity

Windows, Android, Node development runtime, and frontend-common must agree on status, Recovery list/detail, Draft lifecycle, Validation result, Commit result, and stable error codes.

## Implementation Order

1. Shared Resource inspection model.
2. Workout file-level atomic inspection/quarantine.
3. Windows Runtime Resource-atomic behavior.
4. Android parity.
5. Recovery shared/API contract and local Draft persistence.
6. Recoverable-Fact extraction.
7. Validation and Replacement generation.
8. Same-path Recovery Git write.
9. Atomic path relocation Git write.
10. Recovery API endpoints.
11. frontend-common API client/types.
12. Maintenance Recovery UI.
13. Sync/reflection/status integration.
14. Contract parity and E2E hardening.

First vertical slice:

```text
Resource-level Workout quarantine semantics + Runtime continuation
```

## Suggested PR Decomposition

1. Resource Inspection + Workout quarantine semantics.
2. Windows Runtime resource-atomic build.
3. Android Runtime parity.
4. Recovery contract + Draft persistence.
5. Recovery extraction + validation + Replacement.
6. Recovery Git writer + atomic path relocation.
7. Recovery endpoints + frontend-common client.
8. Maintenance Recovery UI.
9. Sync/reflection/status integration.
10. Contract parity + E2E + documentation/release hardening.

Do not mix UI into the initial Runtime semantics PR or hide Git atomic-write behavior inside the UI PR.

## Definition of Done

v2.1.0 Data Recovery is complete when:

- Broken Workout files are quarantined as whole Resources while independent Workout Resources continue.
- Broken Master follows LKG/unavailable contract.
- current Broken Resources are discoverable through Recovery.
- Drafts autosave locally, survive restart, and become stale safely on source revision change.
- Whole Resource Validation is mandatory and only Healthy/Degraded candidates are committable.
- Git write enforces optimistic concurrency.
- path relocation is one atomic commit with no invalid intermediate commit.
- successful Git write is followed by re-inspection and Runtime reflection.
- Git success and reflection failure are distinguishable.
- Windows/Android/Node expose the same public Recovery contract.
- Frontend provides human-readable Recovery without Raw editor or generic Git capability.
