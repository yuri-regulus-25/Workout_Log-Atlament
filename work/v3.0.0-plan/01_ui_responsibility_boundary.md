# UI Responsibility Boundary Refactoring

Related Issue: #135

## Goal
既存UIを横断調査し、人間が局所的に理解できる意味ある責務境界へ分離する。

## Functional Contract
- Card単位等、表示上の意味あるまとまりをComponent候補とする。
- DialogではInput Component等の局所入力責務を分離可能とする。
- 一回しか使わないComponentでも可読性・責務分離に価値があれば許容する。
- UI-local validationは局所化可能だが、Domain/server final validationの責務を奪わない。
- 既存機能の意味論を変更しない。

## Implementation Rule
Implementation前に関連既存実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`
