# Phase 8-E-B — Platform Runtime Implementation

**Related Issue:** #65

## Objective
Phase 8-E-A のContractを Shared/Core、Web normalization、Windows AF、Android AFへ同一 semantics で実装する。

## Requirements
- missing/deleted Master reference を Runtime Build Failure から外す。
- Workout保持、`?`、WARN、original ID、aggregate保持、fallback非発火を全Runtimeで一致させる。
- Windows / Android の製品動作差を作らない。
- inactive等の既存historical semanticsは、今回明示変更したmissing/deleted以外を不用意に変更しない。

## Verification
対象Layerごとのunit/contract testとplatform parityを確認する。
