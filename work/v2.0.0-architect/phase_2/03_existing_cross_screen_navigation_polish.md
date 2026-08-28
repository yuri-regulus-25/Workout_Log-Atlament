# v2.0.0 Phase 2-C — Existing Cross-Screen Navigation Polish

## 日本語

### 前提
Phase 0、Phase 1、および先行する Phase 2 作業が正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### 目的
既存localhost API Contractと既存Workout Dataのみを利用し、既存画面間のNavigationと関連表示を改善する。

### 対象
Dashboardを中心に、既存情報で成立する範囲を対象とする。

- Latest Workoutの視認性改善
- Recent Workoutのcompact presentation
- Dashboard → Workout Detail navigation
- Dashboard → Workout List navigation
- 既存Chartで対象Workoutを一意に特定できるData PointからWorkout Detailへのnavigation
- Navigation時のfocus restoration等、Phase 2-A accessibility baselineとの整合
- Mobile/desktop双方でのnavigation affordance確認

### 対象外
- Calendar View
- Previous Month / Previous Period Comparison
- 新しいPeriod/Aggregate Core
- Main Gym Context
- 新規localhost API field / endpoint
- Portal / Drawer
- 新規Application
- Filter/scroll state等を跨ぐ高度なnavigation state restoration

### 制約
既存ContractでWorkoutを一意に解決できない場合、推測によるNavigationを実装しない。その項目を後続Phaseへ送る。

### Validation
Dashboard、Workout List、Workout Detail間のnavigationをdesktop/mobile相当で確認する。Back/forward、keyboard/focus、empty state、複数session等の既存データ条件で誤遷移がないことを確認する。

### 完了条件
既存API/Data Contractを変更せず、DashboardからWorkout Domainへの主要導線が明確かつ一貫して動作すること。

---

## English

### Prerequisite
Phase 0, Phase 1, and preceding Phase 2 work must be completed and present on the current working branch.

### Objective
Improve navigation and related presentation across existing screens using only existing localhost API contracts and workout data.

### Scope
Improve Latest/Recent Workout presentation, Dashboard-to-Workout Detail/List navigation, navigation from existing chart data points when a workout can be uniquely identified, focus restoration, and mobile/desktop navigation affordance.

### Out of Scope
Calendar views, previous-period comparison, new period/aggregate core logic, Main Gym context, new localhost API fields/endpoints, Portal/Drawer, new applications, and advanced cross-screen filter/scroll state restoration.

### Constraints
If an existing contract cannot uniquely resolve the target workout, do not implement heuristic navigation; defer it to a later phase.

### Validation
Verify navigation among Dashboard, Workout List, and Workout Detail on representative desktop/mobile layouts, including back/forward, keyboard/focus, empty states, and existing multi-session conditions.

### Completion Criteria
Primary navigation from Dashboard into the Workout domain is clear and consistent without changing existing API or data contracts.