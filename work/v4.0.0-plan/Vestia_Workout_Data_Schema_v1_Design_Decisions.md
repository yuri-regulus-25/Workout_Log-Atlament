# Vestia Workout Data Schema v1 --- Design Decisions

## 1. Scope

This document records the decisions finalized for the Vestia
`WorkoutSession` JSON data model and its validation rules.

The design principle for v1 is:

> Only values that are absolutely necessary are Required.\
> Omission of an Optional value does not imply `false` or any other
> default value.

Additional common rules:

-   JSON only. JSONL is not used.
-   `null` is forbidden.
-   `undefined` is not valid data.
-   When an Optional value is not recorded, the key itself is omitted.
-   Empty strings are not used.
-   The v1 schema should describe the current system accurately rather
    than preserving speculative future compatibility.
-   If the schema changes in the future, existing data may be migrated
    wholesale to the new format.

------------------------------------------------------------------------

## 2. WorkoutSession Structure

``` text
WorkoutSession
│
├─ session_id          // Required, UUID v4
├─ date                // Required
├─ gym_id              // Required, Gym Master reference
├─ session_note?       // Optional
│
└─ machine_entries[]   // Required, minItems: 1
   │
   ├─ machine_id       // Required, Machine Master reference
   ├─ machine_note?    // Optional
   │
   └─ sets[]           // Required, minItems: 1
      ├─ weight_kg     // Required
      ├─ reps          // Required
      ├─ rir?          // Optional
      ├─ failure?      // Optional
      ├─ warmup?       // Optional
      └─ set_note?     // Optional
```

Explicitly not included:

-   `schema_version` in each WorkoutSession
-   `status`
-   `condition`
-   set sequence number such as `set: 1`
-   `entry_id`
-   `set_id`
-   `started_at`
-   speculative extension/property bags

------------------------------------------------------------------------

## 3. Example

``` json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2026-09-06",
  "gym_id": "af-shioiri",
  "session_note": "今日は胸中心。",
  "machine_entries": [
    {
      "machine_id": "pectoral-fly",
      "machine_note": "シートを一段下げた。",
      "sets": [
        {
          "weight_kg": 25,
          "reps": 10,
          "rir": 2
        },
        {
          "weight_kg": 25,
          "reps": 10,
          "rir": 1,
          "set_note": "最後の2repが重い"
        },
        {
          "weight_kg": 25,
          "reps": 8,
          "failure": true
        }
      ]
    }
  ]
}
```

------------------------------------------------------------------------

## 4. Required / Optional / Nullability

  Key                 Required   Nullable   Notes
  ------------------- ---------- ---------- --------------------------------------------
  `session_id`        Yes        No         UUID v4
  `date`              Yes        No         Workout date
  `gym_id`            Yes        No         Gym Master reference
  `session_note`      No         No         Omit when absent
  `machine_entries`   Yes        No         At least 1 item
  `machine_id`        Yes        No         Machine Master reference
  `machine_note`      No         No         Omit when absent
  `sets`              Yes        No         At least 1 item
  `weight_kg`         Yes        No         0 is valid
  `reps`              Yes        No         0 is valid
  `rir`               No         No         Omit when unrecorded
  `failure`           No         No         `true`, `false`, and omission are distinct
  `warmup`            No         No         `true`, `false`, and omission are distinct
  `set_note`          No         No         Omit when absent

------------------------------------------------------------------------

## 5. Validation Rules

### 5.1 `session_id`

-   `type: string`
-   Required
-   UUID v4 must be enforced by the Schema, including UUID version
    semantics.
-   UUID generation is an Application responsibility.
-   Uniqueness across WorkoutSessions is an Application/repository
    responsibility.

### 5.2 `date`

-   `type: string`
-   Required
-   Format: `YYYY-MM-DD`
-   Must represent a real calendar date.
-   Future WorkoutSession dates are invalid in Vestia v1.
-   The current-date comparison is an Application responsibility.

Vestia v1 represents actual WorkoutSessions, not future/planned
sessions.

### 5.3 `gym_id`

-   `type: string`
-   Required
-   Empty string is invalid.
-   Whitespace-only string is invalid.
-   No character-set restriction is imposed.
-   A numeric JSON value is invalid because the field must be a string.
-   A numeric-looking string remains a valid string at Schema level.
-   Existence in Gym Master is validated by the Application.

If the actual gym is unknown, the WorkoutSession must still reference an
appropriate Gym Master entry representing that state.

### 5.4 `machine_entries`

-   `type: array`
-   Required
-   `minItems: 1`
-   No `maxItems`.

A WorkoutSession with no actual Set is not stored as a WorkoutSession.

### 5.5 `machine_id`

-   `type: string`
-   Required
-   Empty string is invalid.
-   Whitespace-only string is invalid.
-   No character-set restriction is imposed.
-   Existence in Machine Master is validated by the Application.
-   The same `machine_id` may occur multiple times in one
    WorkoutSession.

Repeated MachineEntries are valid because the user may return to the
same machine later in the session. Entries are not automatically merged.

### 5.6 `sets`

-   `type: array`
-   Required
-   `minItems: 1`
-   No `maxItems`.

A MachineEntry exists only when at least one actual Set exists.

### 5.7 `weight_kg`

-   `type: number`
-   Required
-   `minimum: 0`
-   No maximum.
-   No decimal-place restriction.
-   No fixed step / `multipleOf` restriction.

`0` is an explicit valid value and does not mean "unknown".

Unusually large or unusual values may be handled as an Application/UI
warning rather than rejected by the Schema.

### 5.8 `reps`

-   `type: integer`
-   Required
-   `minimum: 0`
-   No maximum.

`reps: 0` is valid when an actual load-bearing attempt occurred but no
repetition was successfully completed.

Simply sitting at or adjusting a machine without making an attempt does
not create a Set.

### 5.9 `rir`

-   Optional
-   `type: integer`
-   `minimum: 0`
-   No maximum.
-   Decimal RIR values are not supported.

Semantics:

-   omitted: not recorded / unknown
-   `0`: explicitly recorded RIR 0
-   positive integer: explicitly recorded RIR value

RIR is never inferred from `reps` or `failure`.

### 5.10 `failure`

-   Optional
-   `type: boolean`

Semantics:

-   `true`: explicitly recorded as failure
-   `false`: explicitly recorded as not failure
-   omitted: not recorded / unknown

`false` and omission are intentionally distinct.

No automatic consistency rule is imposed between `failure` and `rir`.

### 5.11 `warmup`

-   Optional
-   `type: boolean`

Semantics:

-   `true`: explicitly recorded as warm-up
-   `false`: explicitly recorded as not warm-up
-   omitted: not recorded / unknown

`false` and omission are intentionally distinct.

### 5.12 Notes

Applies to:

-   `session_note`
-   `machine_note`
-   `set_note`

Rules:

-   Optional
-   `type: string`
-   `null` forbidden
-   empty string forbidden
-   whitespace-only string forbidden
-   no `maxLength`

Long-text usability is handled operationally by the Application/UI
rather than by a hard Schema limit.

### 5.13 Unknown Properties

For every defined object:

-   WorkoutSession root
-   MachineEntry
-   Set

use:

``` json
{
  "additionalProperties": false
}
```

Any undefined key is a Schema validation error.

When a new property is legitimately required, the Schema must be changed
explicitly before data using that property is accepted.

------------------------------------------------------------------------

## 6. Schema vs Application Responsibilities

### JSON Schema

The Schema is responsible for structural validity, including:

-   required keys
-   data types
-   non-nullability
-   UUID v4 format
-   date representation
-   array minimum sizes
-   numeric lower bounds
-   integer-only `reps` / `rir`
-   Boolean types
-   unknown-property rejection

### Application

The Application is responsible for contextual validation and operational
behavior, including:

-   `session_id` uniqueness across stored sessions
-   Gym Master referential integrity
-   Machine Master referential integrity
-   rejecting future WorkoutSession dates relative to the current local
    date
-   UI warnings for suspicious but structurally valid values
-   trimming / normalization around text input where appropriate
-   repository-wide validation and migration

------------------------------------------------------------------------

## 7. Versioning / Migration Principle

Vestia does not support mixed WorkoutSession schema versions as a normal
runtime state.

`schema_version` is therefore not stored on each WorkoutSession.

When the schema changes:

1.  Define the new current format.
2.  Migrate all persisted data to that format.
3.  Validate the repository against the current Schema.
4.  Report any incompatible record using its `session_id`.
5.  Do not retain indefinite per-record legacy compatibility merely to
    allow old and new formats to coexist.

A repository/system-level version mechanism may be considered separately
if it becomes necessary, but it is not part of the current
WorkoutSession v1 design.
