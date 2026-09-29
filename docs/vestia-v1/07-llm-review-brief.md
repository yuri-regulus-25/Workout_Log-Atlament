# Vestia v1 — Independent LLM Review Brief

## Purpose

Review this blueprint as an implementation-readiness audit. Do **not** redesign Vestia from scratch and do not reopen preferences merely because another design is possible.

## Source context

Atlament is the existing application and migration source. Vestia is a new v1 line. The work branch contains both Atlament's current design/data and `docs/vestia-v1/`, allowing direct comparison.

## Review targets

Check for:
1. contradictions between Vestia documents;
2. requirements that cannot be implemented deterministically;
3. data-loss paths in migration;
4. Git concurrency/recovery holes;
5. cross-platform semantic drift risks;
6. missing validation that could corrupt SoT;
7. schema vs prose mismatch;
8. implementation blockers where a developer would have to invent product semantics.

## Do not treat as defects

These are intentional:
- no JSONL in Vestia;
- no null;
- no per-record schema_version;
- no set/entry IDs;
- duplicate machine entries are allowed;
- no max weight/reps/RIR/note length;
- body_part is optional free text;
- Master ID naming style is a UI/migration convention, not schema regex;
- `unknown_Gym` is hidden/protected system data;
- no automatic conflict merge;
- no speculative extension bucket;
- no old-schema runtime compatibility after migration.

## Expected output

Use exactly these sections:

### BLOCKER
Only issues that prevent safe/deterministic manufacture.

### SHOULD FIX BEFORE MANUFACTURE
Concrete inconsistencies or underspecified behavior with material implementation impact.

### NON-BLOCKING OBSERVATIONS
Useful but not release-blocking.

### VERDICT
State one of:
- READY
- READY WITH FIXES
- NOT READY

For every BLOCKER/SHOULD FIX item, cite the exact Vestia file/section and propose the smallest correction consistent with the frozen principles.
