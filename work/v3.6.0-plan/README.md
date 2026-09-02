# v3.6.0 — Visualization Playground

Planning branch: `release-3.6.0-plan`

## Purpose
Workout LogをApexChartsの多様なVisualizationへ食わせ、「何それ？」を含めデータの見え方そのものを遊ぶ実験的Applicationを追加する。

## Core Contract
- Alpine + ApexCharts。
- 期間とVisualizationを切り替えて探索する軽量UI。
- Heatmap / Treemap / Radial / Bubble / Range-Timeline / Scatter / Mixed等を候補とする。実装時にApexCharts現行機能を調査して選定する。
- 各Chartが何を表すか説明可能にする。
- 実用性・評価を必須目的としない。
- 元データ、計算、ラベルは正確であること。面白さのために虚偽意味論を作らない。
- Analyticsの正式分析責務とは分離する。

## Implementation Rule
Implementation前にApexCharts現行API、Workout aggregation、Analyticsとの責務衝突を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_chart_catalog.md` — Issue #149
2. `02_playground_application.md` — Issue #150
