# Phase 8-F-D — Platform Behavioral Parity Tests

**Related Issue:** #71

## Objective
Phase 8-F-A Runtime Contract Matrixをテスト仕様としてWindows / Androidのbehavioral parityを固定する。

## Verify
同一状態入力に対して以下が一致すること。
- AF response
- readiness
- requiredActions
- runtimeData facts
- fallback/LKG behavior
- Master Maintenance read/write/unresolved behavior

差異がOS固有事情でない限りRelease Blockingとして扱う。
