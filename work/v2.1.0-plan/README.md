# v2.1.0 — Data Recovery Planning

## Release Theme
v2.1.0は、invalid/brokenなData ResourceをRuntimeへ無理に通すのではなく、隔離されたResourceから正常Schemaに従うReplacement Resourceを生成し、検証後に置換Commitして復旧するData Recovery Releaseとする。

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

## Issues
1. #88 — Invalid Master Record Recovery
2. #89 — Master Resource Recovery
3. #90 — Workout Resource Recovery

## Shared Recovery Pipeline
`Broken Resource → Recoverable Value Extraction → Valid Schema Model / Normalized Draft → Human Resolution → Whole Resource Validation → Replacement File Generation → Replacement Commit → Sync / Runtime Rebuild`

## Out of Scope
- Master record-level partial acceptance（v2.3.0）
- Empty / Initial State formal support（v2.2.0）
- Raw data general-purpose editor
- Validation bypass
- Automatic factual inference
