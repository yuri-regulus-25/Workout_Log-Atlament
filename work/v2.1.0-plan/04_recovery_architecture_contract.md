# v2.1.0 Data Recovery Architecture Contract

## Status

Design state:

- Large decisions: closed
- Middle decisions: closed
- Small design decisions: closed
- Next phase: human user test / UI-UX test

This document freezes the implementation-oriented contract for v2.1.0 Data Recovery. Manufacturing is complete; release remains not ready until human user testing is executed and reviewed.

## 1. Resource / Inspection

- One JSON or JSONL file is one Resource.
- Resource identity is `path + revision`.
- Inspection identity is `path + revision + inspectionVersion`.
- v2.1.0 uses `inspectionVersion = 1`.
- Health is `healthy | degraded | broken`.
- Health priority is `broken > degraded > healthy`.
- Warning-only Resource is Degraded; any broken-severity issue makes it Broken.
- Quarantine is logical only. Detection never moves, renames, deletes, rewrites, or commits the Broken Resource.
- Broken inventory is derived from current Inspection and is not a separate source of truth.
- Inspection cache is reusable only when Resource revision and inspectionVersion both match.
- Inspection enumerates all safely determinable issues and stops when the structure is no longer safely inspectable.
- Machine logic uses structured issue code/severity/location/details, never human-readable message parsing.
- Inspection does not duplicate the full raw Resource.

Conceptual model:

```text
ResourceInspection
- path
- revision
- resourceType
- inspectionVersion
- health
- issues[]

ResourceIssue
- code
- severity
- message
- location?
- details?

ResourceIssueLocation
- line?
- recordId?
- sessionId?
- fieldPath?
```

## 2. Runtime Adoption

### Workout

- Broken Workout Resource is excluded as a whole.
- No healthy-line / healthy-session partial acceptance inside a Broken file.
- Other independent Healthy / Degraded Workout Resources continue.
- Runtime remains available and readiness becomes degraded.
- No per-Resource fallback to an older revision.

JSONL example:

```text
line 1 valid
line 2 invalid
line 3 valid

=> issue may identify line 2
=> sessions adopted from this file = 0
=> Resource health = broken
```

### Master

- Broken Master prevents adoption of a new Runtime.
- Whole-Runtime LKG exists: retain LKG, degraded, fallback active.
- No LKG: Runtime unavailable.
- Record-level partial acceptance is deferred beyond v2.1.0.

Do not construct a patchwork Runtime from mixed current/old per-Resource revisions.

## 3. Recovery Model

```text
Broken Resource
-> Recoverable Facts
-> Recovery Draft
-> Human Resolution
-> Whole Resource Validation
-> Replacement Resource
-> Git Commit
-> Re-Inspection / Runtime Reflection
```

- Recovery does not directly edit Broken raw JSON/JSONL.
- Automatically extract only structurally and safely identifiable values.
- No semantic guessing or automatic factual inference.
- Ambiguous values remain unresolved.
- Unknown/extra fields are not automatically mapped into valid schema fields.
- Recovery Draft is not a valid Domain Resource and may contain unresolved values.
- Draft is device-local, AF-managed, and never written to Git.
- Draft binds to `sourcePath + sourceRevision`.
- Draft persists until successful Recovery or explicit discard; no TTL/autodelete.
- Source revision mismatch makes Draft stale and non-committable.
- No automatic merge.
- A stale Draft remains readable; values may be copied only by explicit human action into a current Draft and then revalidated.
- Draft uses local optimistic concurrency via `draftRevision`.
- Suggestions are optional and never formal input until explicitly accepted.

## 4. Validation / Replacement

- Whole Resource Validation is mandatory.
- Healthy candidate: commit allowed.
- Degraded candidate: commit allowed with warning.
- Broken candidate: commit prohibited.
- Validation includes schema/domain rules plus relevant repository-integrity rules.
- Draft mutation, source revision change, or relevant repository-context change invalidates the previous validation result.
- Revalidate immediately before Git write.
- Frontend supplies human choices/values only; AF/shared domain builds and serializes the Replacement Resource.
- Serialization is canonical and deterministic; byte-for-byte preservation of invalid source formatting is not a goal.

Path handling:

- Preserve original path by default.
- Path change only when required to repair identity/consistency.
- Never implicitly overwrite destination.
- Workout relocation stays inside the Workout resource boundary.
- Fixed Master paths are not arbitrarily relocated.
- Old-path delete + new-path create must be one atomic Git commit.

## 5. Git / Concurrency

- Optimistic concurrency; no repository-wide lock.
- Recheck source revision and relevant repository context immediately before write.
- Conflict stops Commit and requires refresh/revalidation.
- No auto merge/rebase/overwrite/force update.
- Principle: `1 Recovery = 1 Broken Resource = 1 logical Git commit`.
- Same-path replacement may reuse Contents API.
- Path relocation must use an atomic Git tree/commit operation.
- Ambiguous write result must be reconciled remotely before retry.
- Commit message is AF-fixed; Frontend does not provide it.

After commit, automatically attempt sync/refresh, re-inspection, and Runtime rebuild/reflection. Do not roll back the Git commit if Runtime reflection fails. Distinguish Git failure, Git success + reflection failure, and full Recovery success.

No dedicated Recovery Undo/Revert exists in v2.1.0.

## 6. Recovery UI

Recovery is integrated into the existing Resource Management / Maintenance frontend. Do not create a separate Recovery application.

Suggested navigation:

```text
Resource Management
- Masters
- Unresolved References
- Recovery
```

List current Broken Resources only. Show human-readable Resource/type/issue count/priority/Draft state/availability.

Detail flow:

```text
Problem summary
-> Recovery form
-> Validation state
-> Raw source (collapsed, optional)
-> Review changes
-> One final confirmation
-> Commit
```

- Raw source is read-only and collapsed by default.
- Primary UI is normalized field editing, not a Raw editor.
- Draft autosaves locally and UI must make clear it is device-local and not Git state.
- Use one final confirmation immediately before Git write; avoid confirmation spam.
- Human-facing wording should prefer `修復を確定`, `下書き`, `元データ`, etc. Technical code/path/revision belongs in secondary details.

## 7. Responsibility Boundary

Shared/AF domain determines Inspection, Health, issue structure, Recovery eligibility, validation, canonical Replacement generation, priority recommendation, and path/repository authorization.

Frontend displays those facts and collects explicit human choices. It must not infer Broken/Degraded or assemble raw Replacement JSON.

All Git writes go through native AF dedicated write boundaries. Frontend gets no Git credentials and no generic Git/raw JSON write capability.

Windows and Android expose the same public Recovery semantics/API shape. OS-specific persistence/implementation details may differ internally.

Android public parity is truthful capability parity: read/detail/source/draft/validate endpoints are exposed with the shared shape, while Recovery Git commit must report `capabilities.commit=false` and `RECOVERY_UNAVAILABLE` when the packaged Android runtime cannot safely perform the Recovery Git write boundary. Fake commit success is prohibited.

## 8. Status / Readiness

Status must expose Recovery/quarantine facts. Workout quarantine keeps Runtime available but readiness degraded and does not itself enable `fallbackActive`.

`RUNTIME_DATA_REQUIRED` remains reserved for Runtime-unavailable conditions.

Inspection-system failures are operation failures and must not be falsely presented as Broken data.

## 9. Local Draft Storage

- Native AF application-data storage only.
- Never inside the Git repository/working tree.
- Browser storage is not the source of truth.
- Safe storage key derived from repository context + Resource identity; do not use raw repository path as a file name.
- Atomic local write/replace where available.
- Draft persistence starts at `schemaVersion = 1`.

## 10. Explicit v2.1.0 Non-goals

- General Raw JSON/JSONL editor.
- Record-level partial acceptance for Broken Resources.
- Healthy-piece partial acceptance inside one Broken Workout file.
- Per-Resource old-revision Runtime fallback.
- Automatic factual inference.
- Automatic Draft merge.
- Cross-device Draft sync.
- Multi-Resource batch Recovery.
- Dedicated Recovery Undo/Revert.
- Generic Git write API.
- Frontend-held Git credentials.
- Separate durable Recovery audit DB.
- Recovery-specific external telemetry platform.
- History rewrite / force push.
