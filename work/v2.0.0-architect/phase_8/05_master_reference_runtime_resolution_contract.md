# Phase 8-E-A — Runtime Resolution Contract

**Related Issue:** #64

## Objective
Master Reference の Runtime semantics を確定する。

## Contract
- Master reference は `resolved` / `missing` / `deleted` を内部的に区別する。
- `missing` / `deleted` でも Workout は正常データとして保持する。
- Master由来表示は `?` とし、WARN に original `xxx_id` と reason を含める。
- sets/reps/weight/aggregate/count から Workout を除外しない。
- unresolved Master reference は Runtime Error / degraded / fallback の発火条件にしない。
- Raw Workout は書き換えない。
- Master が後に resolve 可能になれば通常 sync/runtime rebuild で再resolveする。

## Manufacturing Rule
Implementation前に関連既存実装を横断調査し、指示書との意味論・依存・Runtime契約の衝突を確認してから変更開始する。

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`
