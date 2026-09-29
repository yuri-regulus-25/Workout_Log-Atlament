# Vestia v1 — Application Contract

## 1. Runtime states

Recommended common readiness states:

- `unconfigured`: repository/credential configuration missing.
- `ready`: supported manifest and accepted data snapshot available.
- `degraded`: accepted snapshot available but remote access or some resources currently have errors.
- `unavailable`: configured but no safe accepted snapshot is available.

Frontend must consume these facts; it must not independently infer repository health.

## 2. Common API boundary

Keep a versioned localhost boundary. Exact route naming may evolve during manufacture, but semantic operations are fixed:

- status/readiness;
- sync;
- Workout list/detail;
- Workout create/update/delete;
- Machine/Gym Master read;
- Machine/Gym Master create/update/activate/deactivate/delete;
- broken/quarantined resource inventory and source inspection;
- configuration/credential management.

Raw generic Git write and arbitrary-path write endpoints are forbidden.

## 3. Error envelope

Use one cross-platform shape:

```json
{
  "success": false,
  "errors": [
    {
      "code": "WORKOUT_VALIDATION_FAILED",
      "message": "Human readable message.",
      "recoverable": true,
      "path": "workouts/2026/09/....json",
      "session_id": "...",
      "pointer": "/machine_entries/0/sets/1/reps"
    }
  ],
  "warnings": [],
  "data": null
}
```

Context fields are optional and omitted when unavailable. Do not emit them as null.

Core codes shall include at minimum:
- `DATA_SCHEMA_UNSUPPORTED`
- `DATA_MANIFEST_INVALID`
- `WORKOUT_VALIDATION_FAILED`
- `MASTER_VALIDATION_FAILED`
- `MASTER_REFERENCE_MISSING`
- `SYSTEM_MASTER_PROTECTED`
- `REPOSITORY_CONFLICT`
- `REMOTE_WRITE_FAILED`
- `WRITE_RESULT_AMBIGUOUS`
- `SYNC_REQUIRED`

## 4. Workout CRUD UX contract

Create:
- app generates `session_id`;
- active Gym/Machine choices only;
- `unknown_Gym` not shown in normal picker;
- at least one machine entry and one set per entry;
- duplicate machine entries allowed;
- optional booleans remain tri-state at data level: omitted/true/false.

Edit:
- session ID immutable;
- date editable; repository path move is internal;
- dirty navigation guard;
- stale revision does not discard local form content.

Delete:
- explicit confirmation;
- physical data deletion after successful commit;
- failure leaves current record visible.

Save:
- duplicate submit prevented while one save is in flight;
- validation errors attach to fields when pointer is known;
- repository conflict is distinct from validation failure;
- ambiguous result does not present a false success or immediately retry.

## 5. Master Maintenance

Machine and Gym maintenance supports Create/Edit/Activate/Deactivate and guarded physical Delete.

ID field:
- show naming hint such as `pectoral_Fly`;
- do not enforce naming convention by regex;
- ID changes after creation should be treated as identity changes and therefore are not a normal Edit operation. v1 UI should keep existing IDs immutable; rename requires a dedicated future migration/refactor operation.

Referenced inactive records remain visible where historical data needs them but are excluded from new Workout pickers.

`unknown_Gym` is filtered from ordinary maintenance and normal pickers and protected again at backend validation. UI hiding is not the security/integrity boundary.

Default Gym is an application preference, not a Gym Master property. Absence of a default does not make the app unavailable.

## 6. Broken resource behavior

A broken Workout must not make unrelated valid history disappear. Expose:
- resource path;
- known session ID if parseable;
- error code/message;
- JSON pointer/line when available;
- raw source inspection.

v1 may provide repair tooling, but it must validate the entire repaired candidate before commit and use the same Git concurrency contract.

## 7. Derived analytics

Analytics consume accepted WorkoutSessions and Master display/classification data. They never rewrite raw Workout data to store derived totals. `body_part` is descriptive Master metadata; analytics must tolerate it being absent.
