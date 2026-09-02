# v3.5.0 — Analytics Rework

Planning branch: `release-3.5.0-plan`

## Purpose
Analyticsを、期間・Gym・Machineを選びWorkoutデータの傾向・推移・構成を掘り下げる対話的分析Applicationへ再構成する。

## Core Contract
- 期間のみ → 全体傾向。
- Gym + 期間 → Gym傾向。
- Gym + Machine + 期間 → Machine詳細分析。
- Main GymがあればGym初期選択に利用可能。
- 全体/Gym: Session数、Machine実施回数、部位別実施頻度、Machine構成推移。
- Machine詳細: Weight、Volume、Reps、Sets、実施頻度、実施間隔の長期推移。
- Weight/Volumeは同一Gym+Machine内で扱い、異種Machineを合算評価しない。
- 自由Query Builderにはしない。

## Implementation Rule
Implementation前に既存Analytics/Report/Compare/集計実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_scope_filter_model.md` — Issue #147
2. `02_trend_composition_analysis.md` — Issue #148
