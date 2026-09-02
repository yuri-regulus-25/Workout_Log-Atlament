# v2.3.0 — Master Runtime Resilience

Planning branch: `release-2.3.0-plan`

## Purpose

Master Resource内の一部Recordがinvalidでも、独立してvalidなRecordをRuntimeで継続利用できるようにする。

v2.0.0のunresolved Master semantics、v2.1.0のRecovery、v2.2.0のEmpty Stateを前提に、Master record-level partial acceptanceを導入する。

## Scope

- Master record-level validation / isolation
- valid record partial acceptance
- invalid / excluded Master reference semantics
- Recoveryとの連携
- Runtime rebuildによる再解決
- Windows / Android parity

## Out of Scope

- Broken Master Resource自体のRecovery（v2.1.0）
- Workout Resource partial acceptance
- invalid Master recordの自動修復・推測
- validation bypass

## Core Contract

- Resourceとしてparse可能かつrecord collectionを解釈可能な場合、Recordごとにvalidationする。
- invalid RecordのみRuntime採用対象から除外し、valid Recordは利用可能とする。
- invalid/excluded RecordへのWorkout referenceはv2.0.0 unresolved semantics (`? + WARN + original xxx_id`) に従う。
- invalid Recordの存在だけを理由にResource全体をRuntimeから排除しない。
- Recoveryではv2.1.0のReplacement Resource方式を使用し、Raw直接編集しない。
- 修復後のsync / Runtime rebuildで通常解決へ復帰する。

## Work Units / Issues

1. `01_record_isolation_contract.md` — Master Record Isolation Contract — Issue #94
2. `02_partial_acceptance_runtime.md` — Master Partial Acceptance Runtime — Issue #134
