# Vestia v1 — Manufacturing Plan

This plan is intended to be executable without reopening settled product decisions.

## Phase 0 — Create repositories

Create:
- Vestia Source repository.
- Vestia Data repository.

Seed Source with this blueprint, schemas, fixtures, validator, shared machine-readable contracts, tests, and application source. Creation of the initial Vestia-Data contents from Atlament is a separate cutover activity outside this manufacturing plan.

## Phase 1 — Contract package

Implement first:
1. JSON Schema files in `schemas/data-v1/`.
2. Type/domain models generated from or tested against the same contract.
3. valid/invalid fixtures.
4. repository validator.
5. machine-readable closed error-code registry and generated/tested platform bindings.

Acceptance:
- schemas compile;
- fixtures produce expected pass/fail;
- a complete candidate Data repository can be validated offline;
- unknown fields fail;
- no-null rule holds.

## Phase 2 — Shared writer contract and repository fixtures

Define the writer rules used by every mutation client, including ChatGPT tooling, and expand shared fixtures for JSON profile, Unicode whitespace, UUID canonical form, inactive/reserved references, quarantine/delete gates, concurrency, and numeric boundary behavior.

Acceptance:
- all supported writers produce the same pass/fail outcomes for shared fixtures;
- duplicate JSON keys and BOM are rejected;
- calendar dates are validated independently of JSON Schema `format` assertion settings;
- no writer bypasses repository/application validation.

## Phase 3 — Repository adapter

Define an interface around GitHub/Git rather than embedding network calls in domain services.

Required operations:
- read manifest;
- read/list Master and Workout resources;
- read HEAD/revision;
- commit one logical mutation atomically;
- inspect commit/path state for ambiguous recovery.

Acceptance:
- create/edit/date-move/delete each result in one logical commit;
- every mutation carries an expected revision;
- commit parent/base tree are the expected revision;
- final branch update is non-force and rejects concurrent advancement;
- stale revision cannot overwrite;
- ambiguous transport result is classified by inspection, not blind retry;
- force update is absent from production path.

## Phase 4 — Application Framework

Port only useful Atlament concepts:
- native shell;
- localhost versioned API;
- configuration/credential boundary;
- accepted local snapshot;
- readiness state;
- quarantine inventory;
- static frontend hosting.

Replace Atlament data parser/write assumptions with Vestia contract.

Acceptance:
- Windows/Android/development/tooling contract outcomes are tested against shared fixtures;
- same error codes and semantics;
- valid data remains available when one Workout is quarantined;
- invalid manifest/Master prevents unsafe writes.

## Phase 5 — Workout CRUD

Implement AF endpoints/services before screen polish.

Acceptance:
- create UUID once;
- edit preserves UUID;
- date move atomic;
- delete physical;
- active Master requirement for new references and retention rules for existing inactive references;
- normal Create/Update cannot newly assign `unknown_Gym`;
- duplicate machine entries allowed;
- omitted booleans remain omitted;
- dirty guard and duplicate-submit guard in UI;
- conflicts preserve local draft/form.

## Phase 6 — Master Maintenance

Implement Machine/Gym CRUD with reference guards.

Acceptance:
- naming hint displayed but not regex-enforced;
- existing IDs immutable in normal edit;
- referenced records cannot be physically deleted;
- Master physical deletion is globally blocked when quarantine prevents complete reference analysis;
- inactive records unavailable for new Workout;
- `unknown_Gym` hidden and backend-protected;
- default Gym stored as app preference, not Master.

## Phase 7 — Read surfaces

Port/rebuild Dashboard, Workout History/Detail, Machine Performance, Analytics as consumers of accepted data. Do not let frontend frameworks own repository semantics.

## Phase 8 — CI

Source CI:
- build/unit tests;
- schema compile;
- fixture tests;
- repository validator tests;
- writer/repository contract tests;
- cross-platform shared-fixture contract tests.

Data CI:
- manifest/schema validation;
- repository integrity validation;
- no unknown files under governed data roots unless explicitly allowed.

## Definition of implementation-ready

Manufacture may proceed without human clarification when a question can be answered by:
1. frozen principles;
2. machine-readable schemas;
3. repository/Git contract;
4. application contract;
5. screen/application binding and shared machine-readable contracts.

Escalate only when a discovered requirement would change persisted semantics, destroy information, weaken concurrency/integrity guarantees, or contradict a frozen principle.
