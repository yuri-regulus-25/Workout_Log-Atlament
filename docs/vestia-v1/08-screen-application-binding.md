# Vestia v1 — Screen / Application Binding

Status: implementation input  
UI basis: `src/frontend/vesria/*` on `feature-vesria-full-redesign`  
Data contract: `docs/vestia-v1/02-data-contract.md`  
Application contract: `docs/vestia-v1/04-application-contract.md`

## 1. Principle

Vestia v1 does not redesign the existing Vesria SPA from zero. The existing visual hierarchy, navigation, workspace composition, interaction model, responsive behavior, motion, dialogs, dirty guards, and review-state affordances are the UI/UX baseline.

The implementation task is to replace legacy Atlament-shaped data and write semantics underneath that UI. Product semantics are defined by the Vestia v1 contract, not by legacy frontend types.

The dependency direction is:

```text
Workspace / UI
  -> Vestia application model
    -> VestiaRepository
      -> Application Framework
        -> Data Repository / Git
```

A Workspace must not know GitHub URLs, repository paths, commit details, JSON file paths, or transport envelopes.

## 2. Existing route inventory

| Route | Workspace | v1 responsibility | Writes |
|---|---|---|---|
| `/` | Entry | product entry / transition | none |
| `/overview` | Overview | aggregate activity and recent sessions | none |
| `/workouts/:sessionId?` | Workout | session list/detail/create/edit/delete | WorkoutSession |
| `/machines/:machineId?` | Machines | machine-oriented history | none |
| `/analysis` | Analysis | deterministic aggregation/filtering | none |
| `/explore` | Explore | exploratory session discovery | none |
| `/resources` | Resources | Machine/Gym Master maintenance | Masters |
| `/settings` | Settings | runtime/configuration/preferences | configuration |
| `/logo-playground` | Logo Playground | design/development utility only | none |

`logo-playground` is not part of the production information architecture.

## 3. Runtime state model

The existing top-level distinction between Review and Live is retained for development/Human Review. Live runtime uses the common readiness states:

- `unconfigured`
- `ready`
- `degraded`
- `unavailable`

Rules:

1. Review data is never substituted for failed Live data.
2. A broken WorkoutSession is isolated and reported; valid sessions remain readable.
3. Repository/manifest/Master corruption that prevents safe interpretation blocks writes.
4. `degraded` may remain readable. Write availability is determined by the write boundary, not inferred from the label alone.
5. A write with uncertain outcome is never automatically retried.
6. Loading, Empty, Data Error, Local Error, Not Found, and Fatal remain visually distinct states.

## 4. Canonical frontend domain shape

The legacy `WorkoutSessionInput` shape is not the Vestia v1 domain model. The frontend application layer must use a v1-native draft.

```ts
type WorkoutSessionDraft = {
  date: string;
  gym_id: string;
  session_note?: string;
  machine_entries: MachineEntryDraft[];
};

type MachineEntryDraft = {
  machine_id: string;
  machine_note?: string;
  sets: SetDraft[];
};

type SetDraft = {
  weight_kg: number;
  reps: number;
  rir?: number;
  failure?: boolean;
  warmup?: boolean;
  set_note?: string;
};
```

The editor may internally hold incomplete form fields while the user types. That form state is not the persistence/domain object and may use empty UI values. Conversion to `WorkoutSessionDraft` occurs before application validation.

No persisted v1 object contains `null`. Future-date validation compares the candidate `date` with the operating client's current local calendar date at validation time.

## 5. Workspace binding

### 5.1 Overview

Reads the current valid session collection plus Master resolution.

Existing presentation is retained:
- training-day count
- session count
- set count
- recent sessions
- daily set rhythm
- body-part distribution

Required changes:
- remove use of legacy `status === partial`
- use `machine_entries`, not legacy `machines`
- body-part aggregation uses optional Machine Master `body_part`; absent body part is displayed as unclassified/unknown rather than synthesized into a persisted category
- invalid isolated sessions are not included in aggregates; issue count remains visible globally

No write API is called.

### 5.2 Workout

This is the primary WorkoutSession CRUD surface.

List/detail:
- identify a session exclusively by `session_id`
- route remains `/workouts/:sessionId?`
- show `date`, resolved Gym, Machine entries, sets, and optional notes
- same `machine_id` may appear multiple times in one session and must remain separate entries
- set display order is array order; no persisted set sequence field exists

Create:
1. obtain current writable repository revision/context
2. open blank form with selected date
3. user supplies required Gym, at least one Machine entry, and at least one set per entry
4. form -> v1 draft conversion
5. schema/application/reference validation
6. confirmation
7. application generates/preserves one UUID v4 for the intended create operation
8. commit/push/verify through repository boundary
9. refresh view

Update:
- fetch latest target JSON and revision before editing
- preserve `session_id`
- date changes may move the repository path; this is one logical commit
- revision mismatch stops with conflict; no merge or overwrite

Delete:
- confirmation -> physical JSON deletion -> one commit
- no deleted/status field is written

Existing dirty guard, confirmation flow, duplicate-submit prevention, narrow-layout detail behavior, and uncertain-result UI are retained.

### 5.3 Machines

Read-only machine-oriented history.

The current interaction model remains: choose Machine, optionally scope by Gym, inspect chronological records.

Changes:
- Machine choices come from Master plus historical references as required for readable history, not only a deduplicated scan of current session entries
- default Gym comes from application preference when configured; `main` no longer exists in Gym Master
- inactive Masters remain usable for historical display but are not offered for new Workout selection
- weight comparison remains scoped to the same Machine and Gym
- duplicate Machine entries in one session produce distinct history observations unless a visualization explicitly aggregates them; aggregation must be deterministic and documented

### 5.4 Analysis

Read-only derived view. All values are computed from valid WorkoutSession data and resolved Masters.

No analytical result is persisted back into Workout JSON.

Filtering must not infer missing optional values. Master `body_part` values are compared as recorded; no implicit case/Unicode normalization is applied. In particular, omitted `body_part`, `rir`, `failure`, and `warmup` mean unknown/unrecorded, not false/default.

### 5.5 Explore

The existing Bobble discovery interaction is retained.

Candidate dimensions remain based on facts available from:
- period
- Gym
- Machine
- optional body part

The existing same-kind OR / cross-kind AND matching rule may remain.

Legacy alias/source-id resolution is removed from runtime. Migration rewrites historical references to canonical v1 IDs. Explore therefore matches canonical IDs directly.

Missing optional `body_part` does not create an invented body classification.

### 5.6 Resources

This workspace requires the largest semantic replacement.

Machine editor exposes:
- `machine_id` — editable only on create in normal v1 UI
- `name`
- optional `body_part`
- `active`

Gym editor exposes:
- `gym_id` — editable only on create in normal v1 UI
- `name`
- optional `short_name`
- `active`

Remove from UI and application model:
- `source_ids`
- `aliases`
- `deleted`
- Gym `main`
- fixed body-part enum requirement

Master ID creation UI displays the non-blocking convention hint:
`lower_Word_Word`

Physical deletion:
- referenced Master: forbidden
- if quarantined/unparseable Workout data prevents complete reference analysis: all Master physical deletion is forbidden
- unreferenced Master: allowed after explicit confirmation
- normal removal from future Workout selection uses `active: false`

`unknown_Gym`:
- System Reserved
- hidden from ordinary Master maintenance and normal Gym selection
- backend mutation/deletion protection is mandatory
- ordinary Create/Update cannot newly assign it; an existing reference may be retained

### 5.7 Settings

Keep:
- Review vs Live development mode
- repository configuration
- credential handoff to Application Framework
- sync/status refresh
- Reduced Motion preference
- review-state preview in review builds

Change:
- Default Gym is an application preference, not `gyms.json.main`
- configuration UI must not imply that Data Repository content stores the default Gym
- unsupported `data_schema_id` blocks writes and is surfaced as a contract/configuration error

Token handling remains outside browser persistent storage.

## 6. Application boundary

The v1 repository interface should expose semantic operations, not legacy date-file operations.

Minimum conceptual surface:

```ts
loadRuntime(): Promise<RuntimeSnapshot>
getWorkout(sessionId: string): Promise<WorkoutEditSnapshot>
createWorkout(revision: string, draft: WorkoutSessionDraft): Promise<MutationReceipt>
updateWorkout(sessionId: string, revision: string, draft: WorkoutSessionDraft): Promise<MutationReceipt>
deleteWorkout(sessionId: string, revision: string): Promise<MutationReceipt>

getMachines(): Promise<MachineMasterSnapshot>
getGyms(): Promise<GymMasterSnapshot>
createMachine(revision, ...)
updateMachine(revision, ...)
setMachineActive(revision, ...)
deleteMachine(revision, ...)
createGym(revision, ...)
updateGym(revision, ...)
setGymActive(revision, ...)
deleteGym(revision, ...)

getStatus()
sync()
getConfiguration()
updateConfiguration(...)
getCredentialStatus()
updateCredential(...)
getPreferences()
updatePreferences(...)
```

Exact transport routes are an Application Framework implementation detail. The UI contract must not require `edit(date)` or a monolithic whole-Master-document save.

## 7. Mutation state machine

All mutating Workspace flows use the same observable state:

```text
idle
 -> editing
 -> validating
 -> confirming
 -> saving
 -> saved
```

Failure branches:
- validation -> editing with field issues
- conflict -> editing/read-latest decision; never overwrite
- definite write failure -> editing
- ambiguous result -> verification-required; Save remains disabled until repository state is inspected
- commit succeeded / push failed -> sync-pending; do not create a second logical mutation

`MutationReceipt` distinguishes result classification, intended/confirmed revision when known, local-commit existence, and remote confirmation so every platform makes the same retry/recovery decision.

The UI must distinguish “not saved” from “saved but not reflected/synced”.

## 8. Error binding

Application error codes are defined by the shared machine-readable v1 Error Code Registry and mapped to user-facing behavior centrally. Frontends do not invent platform-local codes.

| Code | UI behavior |
|---|---|
| `WORKOUT_VALIDATION_FAILED` | field summary + field binding |
| `MASTER_VALIDATION_FAILED` | field summary + field binding |
| `MASTER_REFERENCE_MISSING` | block mutation; identify missing reference |
| `SYSTEM_MASTER_PROTECTED` | block action; reserved-resource message |
| `REPOSITORY_CONFLICT` | stop save; require latest data |
| `REMOTE_WRITE_FAILED` | show sync-pending/remote failure according to receipt |
| `WRITE_RESULT_AMBIGUOUS` | verification-required; no blind retry |
| `SYNC_REQUIRED` | direct user to sync/refresh |
| `DATA_SCHEMA_UNSUPPORTED` | write-blocking contract error |
| `DATA_MANIFEST_INVALID` | write-blocking repository error |

Raw Git/HTTP exception text is diagnostic information, not primary user copy.

## 9. UI invariants

The following existing UX behaviors are requirements unless a later explicit design changes them:

- SPA route transitions and persistent navigation
- wide/narrow responsive composition
- Reduced Motion support
- dirty-editor navigation guard
- explicit destructive confirmation
- no silent fallback from Live to Review
- no silent exclusion of broken data without issue indication
- no automatic retry of uncertain writes
- no mutation from read-only analytical views
- Review data clearly marked as non-persistent
