# Vestia v1 — Product and Architecture

## 1. Scope

Vestia v1 is a personal, machine-based Workout Log system for long-term recording, viewing, maintenance, comparison, and analysis. It is not a multi-user service and does not introduce an `exercise` domain abstraction.

## 2. Repository topology

Two repositories are used.

### Vestia Source

Contains application source, canonical JSON Schemas, fixtures, migration tooling, tests, build definitions, and design documents.

```text
Vestia/
├─ schemas/data-v1/
├─ fixtures/data-v1/
├─ tools/migration/
├─ src/
├─ tests/
└─ docs/
```

### Vestia Data

Contains only persisted user/domain data and repository-level manifest.

```text
Vestia-Data/
├─ manifest.json
├─ masters/
│  ├─ machines.json
│  └─ gyms.json
└─ workouts/
   └─ YYYY/
      └─ MM/
         └─ <session_id>.json
```

Canonical schemas are not duplicated into Vestia Data.

## 3. Runtime architecture

```text
Vestia-Data (GitHub SoT)
        ↓ sync/read
Native Application Framework
  ├─ configuration + credential
  ├─ repository access
  ├─ schema + repository validation
  ├─ local accepted snapshot
  ├─ quarantine/error inventory
  ├─ write/recovery coordinator
  ├─ localhost HTTP API
  └─ frontend artifact hosting
        ↓
Shared domain/client packages
        ↓
Frontend applications
```

Windows and Android may use different native implementations but shall expose equivalent semantics.

## 4. Data correctness boundary

Validation is layered:

1. JSON parse.
2. JSON Schema validation.
3. Repository integrity validation: uniqueness, path/date, filename/session UUID, Master references, manifest support.
4. Operation validation: active reference requirements, optimistic revision check, delete constraints.
5. Git result verification.

A schema-valid document can still be repository-invalid.

### Read policy

- Invalid individual Workout: quarantine that resource and expose an explicit error. Other valid workouts remain available.
- Invalid/unsupported manifest: repository contract cannot be trusted; write is blocked.
- Invalid Master document or duplicate Master identity: Master-dependent safe writes are blocked. Existing accepted local snapshot may remain available as degraded read state.
- Missing Master reference in a raw Workout is a repository integrity error for Vestia v1. It is not silently resolved, guessed, or deleted.

## 5. Version model

Application version and data contract version are independent.

`manifest.json` identifies the data contract:

```json
{
  "data_schema_id": "vestia-data-v1"
}
```

A runtime that does not support the value shall block writes and report the unsupported contract. Best-effort writes against an unknown schema are forbidden.

## 6. Platform parity

The following are contract-level behavior and must not drift between Windows, Android, development runtime, and ChatGPT tooling:

- validation semantics;
- Master reference semantics;
- UUID behavior;
- optimistic concurrency;
- commit/push recovery;
- quarantine behavior;
- error codes;
- no blind retry.

Implementation language and local persistence technology may differ.
