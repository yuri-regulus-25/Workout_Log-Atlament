# v3.0.0 — UI Framework Refactoring

Planning branch: `release-3.0.0-plan`

## Purpose

v3.x Application追加前に既存UIの責務境界を再構成し、Pageを配置・構成・Component呼出中心のComposition Rootへ寄せる。

## Scope

- Card等の意味あるUI責務単位でComponent分離
- Dialog内Input等の局所責務分離
- Pageから詳細実装責務を移動
- 既存機能・Runtime契約・Platform挙動の維持

## Out of Scope

- 新規Application/機能追加
- Domain/Runtime意味論変更
- 再利用性だけを目的とした過剰抽象化

## Implementation Rule

Implementation前に関連既存実装を横断調査し、指示書との意味論・依存・Runtime契約の衝突を確認してから変更開始する。

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues

1. `01_ui_responsibility_boundary.md` — UI Responsibility Boundary Refactoring — Issue #135
2. `02_page_composition_migration.md` — Page Composition Migration — Issue #136
3. `03_regression_verification.md` — UI Refactoring Regression Verification — Issue #137
