# v2.1.0 Recovery Decision Index

Large, Middle, and Small design decisions are closed. This index is a compact map of the frozen decision set; normative detail lives in:

- [04_recovery_architecture_contract.md](./04_recovery_architecture_contract.md)
- [05_recovery_api_and_implementation_plan.md](./05_recovery_api_and_implementation_plan.md)
- `docs/design/02_detailed-design/application-framework/recovery-contract.md`

## Large Decisions

1. Broken Resource / Quarantine basic contract
2. Runtime continuation / stop policy
3. Recovery Data Model
4. Validation / Replacement contract
5. Git write / concurrency / commit contract
6. Recovery UI / Human Resolution contract
7. Windows / Android / Frontend responsibility boundary

All Large decisions are closed.

## Key Human Decisions Fixed During Middle Design

- Draft lifetime: retain until successful Recovery or explicit discard; no TTL/autodelete.
- Path relocation: old delete + new create must be one atomic Git commit.
- Draft sync: device-local only in v2.1.0.
- Recovery ordering: system recommends order but does not normally force it.
- Raw Source: collapsed/read-only secondary view.
- Multi-resource bulk Recovery: out of scope for v2.1.0.
- Draft autosave: local automatic persistence with clear UI state.
- Recovery Undo/Revert: no dedicated v2.1.0 feature.
- Repository concurrency: optimistic concurrency; no repository-wide lock.
- Stale Draft: no auto-merge; explicit human value copy into current Draft is allowed.

All remaining Middle decisions were derived automatically from the Large contract and these choices.

## Small Design Closure

Small design freezes implementation-facing contracts for:

- ResourceInspection / ResourceIssue / Health semantics.
- Draft identity, draftRevision, provenance, stale/corrupt/incompatible states.
- Recovery API namespace/endpoints and stable machine error codes.
- Validation snapshot / commit result semantics.
- Status/readiness/quarantine facts.
- Maintenance UI flow and one final commit confirmation.
- AF-local Draft storage.
- Same-path vs atomic path-relocation Git write behavior.
- Windows / Android / Node public contract parity.
- Required regression/integration/E2E tests.
- Implementation order and suggested PR decomposition.

Implementation-local choices such as exact class/file names, Vuetify component selection, debounce milliseconds, fixture filenames, and private helper naming are intentionally not frozen; they should follow repository conventions and implementation evidence.

## First Vertical Slice

```text
Resource-level Workout quarantine semantics + Runtime continuation
```

This is the first recommended implementation slice because it establishes the core v2.1.0 safety property independently of Recovery UI and Git write support.
