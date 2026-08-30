# Phase 10-B — Runtime Contract Corrections

**Related Issue:** #77

## Objective

Phase 10-Aで確認した実際のv2.0.0 Contract違反のみFix-forwardする。

## Mandatory Flow

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Guardrails

- Correctな既存実装は変更しない。
- Future仕様を実装しない。
- 純粋なソースリファクタリングを行わない。
- Release scopeを拡張しない。
