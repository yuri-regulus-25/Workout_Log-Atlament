# Vestia v1 — Data Contract

Canonical machine-readable definitions are under `schemas/`. This document defines repository-level semantics not expressible by JSON Schema alone.

## WorkoutSession

```text
WorkoutSession
├─ session_id          required UUID v4
├─ date                required YYYY-MM-DD
├─ gym_id              required Master reference
├─ session_note?       optional
└─ machine_entries[]   required, min 1
   ├─ machine_id       required Master reference
   ├─ machine_note?    optional
   └─ sets[]           required, min 1
      ├─ weight_kg     required number >= 0
      ├─ reps          required integer >= 0
      ├─ rir?          optional integer >= 0
      ├─ failure?      optional boolean
      ├─ warmup?       optional boolean
      └─ set_note?     optional
```

Rules:
- `date` must be a real calendar date. On Create/Update, it must be less than or equal to the calendar date that is current in the operating client's local time zone when the operation is validated.
- `reps: 0` is valid and means an actually attempted set with zero completed repetitions.
- Same `machine_id` may appear multiple times in one session; entries are not auto-merged.
- Notes are non-empty/non-whitespace strings when present. No max length is imposed by v1 schema.
- No `null`.
- Omitted `failure` / `warmup` means unrecorded, not false.
- `failure`, `rir`, `warmup`, and other recorded facts are not cross-inferred. For example, `failure: true` with `rir > 0` remains valid.
- No set sequence field; array order is sequence.
- No entry/set IDs.
- Unknown properties are rejected at every object level.

## Machine Master

```text
Machine
├─ machine_id   required
├─ name         required
├─ body_part?   optional
└─ active       required boolean
```

`body_part` is a free nonblank string in v1, not a closed enum.

## Gym Master

```text
Gym
├─ gym_id       required
├─ name         required
├─ short_name?  optional
└─ active       required boolean
```

### System-reserved Gym

```json
{
  "gym_id": "unknown_Gym",
  "name": "Unknown Gym",
  "active": true
}
```

`unknown_Gym` is reserved by the application:
- must exist in the Gym Master;
- must remain active;
- cannot be renamed, deactivated, or deleted through normal maintenance;
- is hidden from normal Gym maintenance and normal selection UI;
- cannot be newly assigned by ordinary Workout Create/Update; an existing Workout that already references it may retain that reference during Update.

## Master ID convention

Schema validation only requires a nonblank string. Vestia does **not** reject IDs based on naming style.

UI hint / migration convention:
- first token starts lowercase;
- words are joined with `_`;
- each token after `_` starts uppercase;
- examples: `af_Shioiri`, `pectoral_Fly`, `shoulder_Press`, `unknown_Gym`.

This is a convention, not a schema regex.

Master ID identity uses exact, case-sensitive string equality. Vestia does not automatically case-fold or Unicode-normalize an existing Master ID.

## Physical deletion

A Master record referenced by any Workout cannot be physically deleted. Reference analysis includes quarantined Workouts whenever their references can be determined. If any quarantined/unparseable Workout prevents complete reference analysis, **all Master physical deletion is blocked** until reference completeness is restored. It may still be changed to `active:false` where otherwise permitted. An unreferenced Master may be physically deleted after explicit confirmation.

`active:false` means unavailable for new Workout selection/write. It does not invalidate historical data.

For Update, an inactive reference already present in the saved Workout may be retained. An inactive Gym may be retained only when the candidate keeps the same `gym_id`. For each inactive Machine ID, the candidate may contain no more entries for that ID than the saved Workout contained; this allows editing the existing entry/sets without creating additional inactive Machine references.

## Repository integrity

The repository validator shall reject/report:
- duplicate `session_id`;
- duplicate `machine_id` or `gym_id`;
- Workout filename not equal to `<session_id>.json`;
- Workout path year/month not equal to its `date`;
- missing Master reference;
- missing or mutated reserved `unknown_Gym`;
- unsupported manifest;
- schema violations.

Workout `session_id` uses lowercase canonical UUID v4 text. The filename must use that exact lowercase value.

Vestia-written JSON is UTF-8 without BOM, uses LF, ends with a newline, and uses stable key ordering for readable Git diffs. Duplicate object keys are invalid. Semantic comparison is performed on parsed values rather than serialized key order. Integer-valued fields are emitted using integer lexical form by Vestia writers.

The validator never repairs by guessing.
