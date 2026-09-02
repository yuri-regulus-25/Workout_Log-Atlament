# v3.2.0 — Monthly Report

Planning branch: `release-3.2.0-plan`

## Purpose
指定月のWorkoutを評価せず、事実として包括的に俯瞰するMonthly Reportを追加する。

## Core Contract
- Monthly only。Weekly/Yearlyなし。
- 主階層はSession → Machine。
- Training Days、Sessions、月内活動パターン、Machine実施頻度、Machine分類由来の部位別実施頻度、同一Machine推移。
- 部位頻度はMachine execution count基準。
- 前月差分は各文脈へ小さく埋め込み、独立Compare化しない。
- 異種MachineのWeight/Volume合算、Score、成長判定、PR/e1RM/RIR/Radar等を行わない。

## Implementation Rule
Implementation前にReport/Analytics/Workout集計既存実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_monthly_report_domain.md` — Issue #141
2. `02_presentation_verification.md` — Issue #142
