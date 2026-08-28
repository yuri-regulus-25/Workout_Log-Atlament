# v2.0.0 Phase 5-B — Workout History Derived Logic

## 日本語

### 前提
Phase 0〜Phase 4および先行するPhase 5作業が現在の作業Branchへ反映済みであることを前提とする。

### 目的
既存Workout履歴のみから意味が一意に確定する履歴Navigation・比較用Domain Logicを共通Coreへ実装する。

### 対象
- Previous Workout / Next Workout resolver
- Workout単位のTotal Reps等、既存Set情報から確定するSummary
- Session Compare
  - Machine数差分
  - Set数差分
  - Total Reps差分
  - Added Machine
  - Removed Machine

### 制約
- Weight比較を行わない。
- Volume比較を行わない。
- PR / Best / e1RM / Performance評価を行わない。
- Body Part Performance評価を行わない。
- Main Gym Contextを導入しない。
- 比較対象を一意に解決できない場合、推測しない。
- API/Data Schemaを変更しない。
- UI文言・視覚デザインは製造時および人間の画面レビューで調整する。

### 完了条件
Workout履歴の前後解決と、Gym/Machine重量差に依存しない事実ベースのSession Compareが共通Coreから利用可能であること。

---

## English

### Prerequisite
Phase 0 through Phase 4 and preceding Phase 5 work must be present on the current working branch.

### Objective
Implement shared history-navigation and comparison logic whose semantics are uniquely determined from existing workout history.

### Scope
Previous/next workout resolution, factual workout summaries such as Total Reps, and session comparison for machine count, set count, total reps, added machines, and removed machines.

### Constraints
Do not compare Weight or Volume and do not calculate PR, Best, e1RM, performance judgment, or body-part performance. Do not introduce Main Gym context or change API/data schemas. Never guess when a comparison target cannot be uniquely resolved. UI wording/design is refined during implementation and human visual review.

### Completion Criteria
Shared core exposes reliable previous/next history resolution and factual session comparison independent of gym/machine weight comparability.