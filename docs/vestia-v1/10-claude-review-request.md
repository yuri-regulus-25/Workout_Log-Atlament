# Vestia v1 — Claude Implementation-Readiness Audit Request

## Your role

Act as an independent implementation-readiness reviewer.

The attached/repository documents define the current **frozen Vestia v1 design baseline**. Review the design for whether a manufacturing team can implement it safely and deterministically.

This is an **audit**, not a redesign exercise.

Do not reopen a settled product choice merely because you would personally design it differently. A different valid architecture is not, by itself, a defect.

---

## What to review

Review the complete Vestia v1 design set:

1. `README.md`
2. `01-product-and-architecture.md`
3. `02-data-contract.md`
4. `03-repository-git-contract.md`
5. `04-application-contract.md`
6. `05-migration-plan.md`
7. `06-manufacturing-plan.md`
8. `08-screen-application-binding.md`
9. `09-frontend-cutover-plan.md`
10. `schemas/manifest.schema.json`
11. `schemas/workout-session.schema.json`
12. `schemas/machine-master.schema.json`
13. `schemas/gym-master.schema.json`
14. the JSON examples under `examples/`

The existing frontend implementation under `src/frontend/vesria/*` is the UI/interaction baseline. It still contains legacy Atlament contract assumptions; those are already identified as cutover work. Do not treat a known legacy field in the current implementation as evidence that the frozen Vestia contract should be changed.

---

## Audit questions

Find concrete cases of:

1. contradictions between Vestia documents;
2. prose vs JSON Schema mismatch;
3. requirements that cannot be implemented deterministically;
4. missing validation capable of corrupting the Source of Truth;
5. Git optimistic-concurrency or recovery holes;
6. ambiguous write-result behavior that could cause duplicate/lost mutations;
7. migration paths that can silently lose or alter source information;
8. cross-platform semantics likely to drift between Windows / Android / development runtime / ChatGPT tooling;
9. frontend/application boundary gaps where a developer must invent product semantics;
10. missing test/fixture coverage for a contract-level invariant.

For each issue, distinguish an actual implementation blocker from a preference or possible enhancement.

---

## Frozen decisions — DO NOT report these as defects

These are deliberate v1 decisions:

- JSON only; no JSONL in Vestia runtime data.
- One WorkoutSession = one JSON file.
- No `null` in persisted Vestia v1 data.
- Optional field omission means unknown/unrecorded; omission is not equivalent to `false`.
- No per-record `schema_version`.
- Repository contract version comes from `manifest.json`.
- No MachineEntry ID.
- No Set ID.
- Array order defines MachineEntry/Set order.
- Duplicate `machine_id` entries within one WorkoutSession are allowed.
- No maximum MachineEntry count.
- No maximum Set count.
- No maximum `weight_kg`.
- No maximum `reps`.
- No maximum `rir`.
- No maximum note length.
- `reps: 0` is valid.
- `weight_kg: 0` is valid.
- `body_part` is optional free nonblank text, not an enum.
- Master ID style such as `pectoral_Fly` is a UI/migration convention, not a Schema regex.
- `unknown_Gym` is reserved, protected, normally hidden system data.
- Existing Master IDs are immutable in ordinary v1 editing.
- Inactive Masters remain valid for historical references.
- Referenced Masters cannot be physically deleted.
- Gym default selection is application preference, not Gym Master data.
- No automatic Git conflict merge.
- No force push.
- No last-write-wins.
- No blind retry after an ambiguous mutation.
- No speculative extension bucket.
- No runtime compatibility with old Atlament data after migration/cutover.
- No bidirectional Atlament/Vestia synchronization.
- Analytics are derived and are not persisted into Workout JSON.
- Existing Vesria visual/interaction design is the v1 UI baseline; this audit is not a visual redesign.

---

## Important semantic principle

A central rule is:

> Only absolutely necessary data is required. Optional data may be omitted, and omission does not mean false.

Do not propose defaults that erase that distinction.

---

## Severity definitions

### BLOCKER

Use only when manufacture cannot safely or deterministically proceed without resolving the issue, or when the current specification can cause corruption/data loss while still appearing compliant.

### SHOULD FIX BEFORE MANUFACTURE

Use for a concrete contradiction, underspecified contract, or cross-platform ambiguity with material implementation impact, but where the intended v1 direction is still recoverable without reopening the product.

### NON-BLOCKING OBSERVATIONS

Use for improvements, maintainability concerns, additional test ideas, wording issues, or future considerations that do not prevent v1 manufacture.

Do not inflate severity merely because an alternative architecture would be cleaner.

---

## Required response format

Use **exactly** these top-level sections:

### BLOCKER

For every item:
- concise issue title;
- exact file + section/schema location;
- why this creates a real implementation/safety problem;
- smallest correction consistent with the frozen decisions.

If none, write `None.`

### SHOULD FIX BEFORE MANUFACTURE

Same evidence requirements as BLOCKER.

If none, write `None.`

### NON-BLOCKING OBSERVATIONS

Keep these concise and separate from defects.

If none, write `None.`

### VERDICT

Write exactly one of:

- `READY`
- `READY WITH FIXES`
- `NOT READY`

Then add a short explanation of what must happen before manufacture, without introducing a new severity category.

---

## Review discipline

- Cite exact files/sections for every BLOCKER and SHOULD FIX item.
- Prefer the smallest compatible correction over redesign.
- Do not invent requirements absent from the documents.
- Do not assume the current Atlament implementation is authoritative over the frozen Vestia documents.
- If two documents genuinely disagree, identify both sides.
- If something is merely an implementation choice and the contract already constrains its externally observable behavior, do not demand that the design prescribe the internal algorithm.
- If you cannot establish that an issue has material implementation impact, place it under NON-BLOCKING OBSERVATIONS or omit it.

The objective is simple:

> Can implementation begin without developers having to invent product semantics or weaken the defined data/concurrency guarantees?
