# v2.1.0 — Data Recovery Planning

## Release Theme
v2.1.0は、invalid/brokenなData ResourceをRuntimeへ無理に通すのではなく、隔離されたResourceから正常Schemaに従うReplacement Resourceを生成し、検証後に置換Commitして復旧するData Recovery Releaseとする。

## Design Status

- Large design decisions: **Closed**
- Middle design decisions: **Closed**
- Small design decisions: **Closed**
- Current phase: **Implementation / PR planning**

Frozen implementation-oriented contracts:

- [04_recovery_architecture_contract.md](./04_recovery_architecture_contract.md) — Resource/Inspection、Runtime、Draft、Validation、Git、UI、責務境界
- [05_recovery_api_and_implementation_plan.md](./05_recovery_api_and_implementation_plan.md) — API、DTO、実装責務、Tests、実装順序、PR分割
- [06_recovery_decision_index.md](./06_recovery_decision_index.md) — Planning decision index

## Architecture Principles
- Broken Resourceを直接編集しない。
- Raw JSON / JSONL Editorを一般機能として提供しない。
- Recoveryは回収可能な値を正常Schema Model / Normalized Draftへ取り込む。
- schema-generated UI / 共通Recovery UIを最大限再利用し、壊れ方ごとの専用UIを量産しない。
- システムは欠損・duplicate・conflict等の事実を推測して自動確定しない。
- Whole Resource Validation成功後のみReplacement Fileを生成・Commitできる。
- Validation bypassやbroken intermediate commitは禁止する。
- v2.3.0までMaster record-level partial acceptanceは行わない。
- Workout Resource内部のhealthy pieceだけをpartial acceptanceしない。Affected Resource全体を隔離し、他の独立Resource/dateは通常処理する。
- Workout Broken時はper-Resource旧Revision fallbackを行わず、他のcurrent Healthy/Degraded ResourceだけでRuntimeを継続する。
- Master Broken時は新Runtimeを採用せず、whole-Runtime LKGがあれば継続、なければRuntime unavailableとする。
- Recovery Draftはdevice-local/AF-managedでGitへ保存しない。
- Git writeはoptimistic concurrencyを使用し、Repository全体lock、自動merge/overwrite/force updateは行わない。
- `1 Recovery = 1 Broken Resource = 1 logical Git commit`を原則とする。

## Issues
1. #88 — Invalid Master Record Recovery
2. #89 — Master Resource Recovery
3. #90 — Workout Resource Recovery

## Shared Recovery Pipeline
`Broken Resource → Recoverable Value Extraction → Recovery Draft → Human Resolution → Whole Resource Validation → Replacement Resource Generation → Replacement Commit → Re-Inspection / Sync / Runtime Rebuild`

## First Implementation Vertical Slice

`Resource-level Workout quarantine semantics + Runtime continuation`

## Out of Scope
- Master record-level partial acceptance（v2.3.0）
- Empty / Initial State formal support（v2.2.0）
- Raw data general-purpose editor
- Validation bypass
- Automatic factual inference
- Automatic Draft merge
- Cross-device Draft sync
- Multi-Resource batch Recovery
- Dedicated Recovery Undo/Revert
- Generic Git write API
- History rewrite / force push
