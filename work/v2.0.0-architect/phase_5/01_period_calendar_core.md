# v2.0.0 Phase 5-A — Period & Calendar Core

## 日本語

### 前提
本Phaseは Phase 0〜Phase 4 が正常に完了し、その変更が現在の作業Branchへ反映済みであることを前提とする。先行Phase未完了状態へのBackward Compatibilityは要求しない。

### 目的
既存Workout Data Schemaおよび既存Read API Contractを変更せず、複数Frontendから再利用可能な期間解決・期間比較・Calendar集計のDomain Logicを `workout-core` 側へ集約する。

### 対象
- Period preset resolution: `7d / 28d / Month / 3m / 6m / All`
- 指定期間によるWorkout filtering
- Previous Period / Previous Month範囲算出
- absolute delta / percentage delta（比較可能な事実値のみ）
- Daily / Session / Weekly / Monthly aggregation
- 指定年月のCalendar対象期間解決
- Training Day / 日別Session Count / 日別Workout Session参照のためのCalendar aggregation

### 制約
- Yearly presetは追加しない。
- Main Gym Contextを導入しない。
- Weight / Volume等、Gym/Machine comparabilityに依存する比較は本Phaseで新規に有効化しない。
- localhost API、Master/Workout Data Schemaを変更しない。
- UI文言・視覚デザインを固定しない。製造時に既存UIとの整合を踏まえて提案し、人間の画面レビューで調整する。

### 完了条件
期間・Calendar関連の派生計算がFrontendへ重複実装されず、既存Dataから意味が確定する範囲で `workout-core` に再利用可能な形で集約されていること。

---

## English

### Prerequisite
Phase 0 through Phase 4 must be completed and present on the current working branch.

### Objective
Without changing existing Workout Data schemas or Read API contracts, centralize reusable period resolution, period comparison, and calendar aggregation domain logic in `workout-core`.

### Scope
Period presets (`7d / 28d / Month / 3m / 6m / All`), period filtering, previous-period/month resolution, factual deltas, daily/session/weekly/monthly aggregation, month range resolution, training-day/session-count/calendar aggregation.

### Constraints
Do not add a yearly preset, Main Gym context, or new Weight/Volume comparisons dependent on gym/machine comparability. Do not change localhost APIs or data schemas. UI wording and visual design are intentionally not fixed here; they are refined during implementation and human visual review.

### Completion Criteria
Period/calendar derived logic is reusable from `workout-core` and is not duplicated across frontends.