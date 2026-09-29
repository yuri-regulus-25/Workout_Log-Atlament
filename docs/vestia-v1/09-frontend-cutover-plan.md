# Vestia v1 — Frontend Cutover Plan

Status: manufacturing plan  
Target baseline: `src/frontend/vesria/*`

## 1. Purpose

Convert the existing Vesria review SPA into a Vestia v1 client without discarding its reviewed UI/interaction work.

This is a contract migration, not a visual rewrite.

## 2. Known legacy-contract conflicts

The current frontend still contains Atlament v3.x semantics that conflict with the frozen Vestia v1 contract.

| Current frontend assumption | Vestia v1 |
|---|---|
| form/domain fields may use `null` | persisted/domain v1 omits optional fields; form state separated |
| `machines` | `machine_entries` |
| note arrays / `notes` | scalar `session_note`, `machine_note`, `set_note` |
| `status` / partial record | removed |
| duplicate Machine forbidden | duplicate Machine entries allowed |
| Machine count max 10 | no v1 maximum |
| Set count max 10 | no v1 maximum |
| reps 1..100 | integer >= 0, no maximum |
| weight <= 999.99 / 2 decimals | number >= 0, no maximum/precision rule |
| note max 400 | nonblank if present, no maximum |
| body_part required/fixed enum in editor | optional nonblank free string |
| `source_ids` | removed; migration rewrites IDs |
| `aliases` | removed |
| `deleted` logical deletion | removed; active=false or guarded physical delete |
| Gym `main` | removed; app preference |
| whole Master document save | semantic Master operations |
| date-oriented edit snapshot | session/revision-oriented edit |
| legacy AF compatibility adapter | Vestia AF adapter |

These are implementation defects after cutover, not alternative supported modes.

## 3. Recommended implementation sequence

### Phase F1 — v1 types and fixtures

Create a Vestia-native application/domain package or module and fixtures matching the canonical JSON Schemas.

Do not modify visual components yet.

Deliver:
- v1 persisted types
- editor form-state types
- form -> draft mapper
- runtime resolved-view types
- valid/invalid fixtures
- contract tests against canonical schemas

### Phase F2 — validation replacement

Replace `src/frontend/vesria/src/application/validation.ts` legacy limits with v1 rules.

Validation layers remain distinct:
1. form completeness
2. JSON Schema
3. application rules
4. Master reference rules
5. repository integrity/revision rules

The frontend may provide early feedback but Application Framework remains authoritative for writes.

### Phase F3 — repository boundary

Replace the legacy repository contract with semantic v1 operations.

Introduce a Vestia AF adapter. Keep `LegacyAfRepository` only as a temporary migration aid while tests are being converted; it is not part of the completed v1 runtime.

No Workspace calls `fetch` directly.

### Phase F4 — Workout workspace

Convert Workout first because it exercises the full persistence contract.

Acceptance:
- create/update/delete work with UUID v4 session identity
- duplicate Machine entries survive round-trip
- reps=0 survives round-trip
- optional booleans preserve omitted vs false vs true
- omitted notes remain omitted
- date move preserves session_id
- conflict does not overwrite
- ambiguous write cannot be blindly retried
- dirty guard remains functional

### Phase F5 — Resources + Settings

Convert Master maintenance and move default Gym to application preference.

Acceptance:
- no legacy Master fields remain in UI
- optional free-text body_part works
- referenced physical deletion is rejected
- unreferenced physical deletion requires confirmation
- unknown_Gym is hidden/protected
- inactive entries remain readable historically
- new Workout selection excludes inactive entries
- Master ID convention is a hint, not a validation pattern

### Phase F6 — read-only workspaces

Convert Overview, Machines, Analysis, Explore to the v1 resolved runtime model.

Remove all runtime dependency on:
- status/partial
- source_ids
- aliases
- deleted
- main

Derived metrics must preserve missing-value semantics.

### Phase F7 — remove compatibility residue

Delete or retire:
- legacy v3.1 validation assumptions
- legacy AF adapter
- old domain type imports used only for Atlament
- compatibility copy that describes logical delete/main/source IDs
- production navigation entry for playground utilities

Search the Vesria subtree for every removed field/name before declaring cutover complete.

## 4. Test matrix

### Contract tests

Must include at least:
- valid minimal session
- all optional session fields omitted
- optional booleans false
- optional booleans true
- reps 0
- weight 0
- large valid weight/reps/RIR
- duplicate machine_id entries
- whitespace-only optional note rejected
- null rejected
- unknown property rejected
- invalid UUID version rejected
- missing Master reference rejected
- future date rejected by application rule

### Workspace tests

Workout:
- create/update/delete
- date change
- dirty guard
- validation feedback
- conflict
- ambiguous result
- sync-pending result

Resources:
- create/update/activate/deactivate/delete
- referenced-delete rejection
- System Reserved protection
- free-text body_part
- optional short_name

Read-only:
- empty
- one session
- broken session isolated
- unresolved reference indication
- duplicate Machine entries
- missing optional body_part

Responsive/state:
- wide/narrow
- Reduced Motion
- loading
- empty
- degraded
- unavailable
- route not found
- local render failure

## 5. Definition of frontend cutover complete

Frontend cutover is complete only when all are true:

1. `src/frontend/vesria/*` builds and tests against the Vestia v1 contract.
2. No production path depends on Atlament v3.x Workout/Master shapes.
3. No UI validation rejects a value that the frozen v1 contract intentionally permits.
4. No UI silently invents a value for an omitted optional field.
5. All mutations use optimistic revision checks.
6. Uncertain writes cannot be automatically resubmitted.
7. All seven production Workspaces operate on the v1 runtime model.
8. Review mode remains clearly non-persistent.
9. production navigation excludes development playgrounds.
10. canonical schema fixtures pass on every supported platform.

## 6. Manufacturing handoff rule

A developer should not reinterpret the old Vesria implementation as product truth when it conflicts with `docs/vestia-v1/*`.

Priority is:

```text
Frozen Vestia v1 contract
  > Screen/Application binding
  > Existing Vesria interaction/visual behavior
  > Legacy Atlament implementation details
```

If a conflict cannot be resolved by that priority, it is a product-design escalation. Otherwise it is an implementation decision.
