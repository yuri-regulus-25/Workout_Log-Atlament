# Phase 8-E-C — Maintenance & Master Lifecycle Integration

**Related Issue:** #66

## Objective
Unresolved Master reference と Master Maintenance / lifecycle を統合する。

## Requirements
- Maintenanceでoriginal IDとmissing/deleted reasonを確認可能にする。
- 参照中Masterのlogical deleteを許可する。
- deleted referenceはunresolvedへ遷移し、Workoutは保持する。
- 現行の「Runtime sessionから参照中ならMaster削除拒否」を新Contractに合わせて撤廃する。
- Master修復後は通常sync/runtime rebuildで自動再resolveする。
- Raw Workoutは直接書き換えない。
- Main Gym lifecycle invariantは変更しない。
