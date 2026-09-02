# v3.3.0 — Compare

Planning branch: `release-3.3.0-plan`

## Purpose
同一Gym・同一MachineのWorkout実績について、前回 → 今回 → 次回の変化を直接確認するApplicationを追加する。

## Core Contract
- 比較EntityはMachine execution。
- 今回を選択し、同一`gym_id + machine_id`の最近傍前回/次回を自動取得。
- 欠落は正常状態。
- 主指標はVolume。今回=100%基準で前回/次回差分を表示。
- Volumeはrecord/setごとのWeight×Reps合計。
- Weight/Reps/Setsを根拠実績として表示。
- 異種Machine比較、成長/Performance評価を行わない。

## Implementation Rule
Implementation前に比較・集計・期間関連既存実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_comparison_contract.md` — Issue #143
2. `02_presentation_verification.md` — Issue #144
