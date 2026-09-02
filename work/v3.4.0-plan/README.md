# v3.4.0 — Training Map

Planning branch: `release-3.4.0-plan`

## Purpose
指定期間に身体のどこを、どのMachineで、どれくらいの頻度でトレーニングしたかを身体図から探索するApplicationを追加する。

## Core Contract
- 身体図を主Navigationとする。必要に応じ前面/背面。
- body part → Machine classification → Workout actuals。
- Machine Master部位分類 + Workout LogをSoTとする。
- All Time + arbitrary/custom period。
- 期間変更時にmap/Machine統計を再計算。
- 部位頻度はMachine execution count基準。
- Machineにlast execution、count、simple recent actualsを表示可能。
- 刺激割合、肥大、不足等を推論しない。

## Implementation Rule
Implementation前にMachine Master分類・Workout集計・既存UIを横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_body_part_contract.md` — Issue #145
2. `02_period_ui_verification.md` — Issue #146
