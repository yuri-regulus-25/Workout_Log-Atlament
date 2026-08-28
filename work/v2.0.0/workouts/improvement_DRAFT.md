# v2.0.0 Workout Domain 改修 DRAFT

## 状態

Workout Domainの一次候補をレビューし、採用・保留・見送りを整理したDRAFT。

## Workout Domainの基本方針

Workout Domainは、Workout履歴の探索と「その日に何をしたか」の確認を主責務とする。

過去との詳細なPerformance分析・評価はPerformance Detail等の専門画面へ委譲し、Workout側では必要な場合のみ簡易比較に留める。

Frontendは表示・画面操作を担当し、集計・比較等のDomain LogicはCoreへ配置する。

---

# 1. Workout一覧の検索・絞り込み強化

**状態: 採用**

現行のMachine Filterに加えて、Workout履歴を探しやすくするため一覧機能を強化する。

候補:

- Body Part / Gym / Date RangeによるFilter
- 複数条件Filter
- Search Text
- Newest / Oldest / Volume / Sets等のSort
- Filter Reset
- Filter状態のURL Query反映
- Filter件数表示
- 年/月単位のGrouping
- Sticky Filter
- データ件数に応じてPagination / Virtualized Listを検討

具体的な情報量・操作性は実装後の画面レビューで調整する。

---

# 2. Calendar View

**状態: 採用**

Workout Domain内でList / Calendarを切り替えられるようにする。

新規Applicationとして分離せず、Workout履歴を別表現で探索するViewとして扱う。

候補:

- List / Calendar切替
- Month Calendar
- Training Day Marker
- Session Count
- Day ClickからWorkout Detailへ遷移
- Month送り
- Today Shortcut

Volume intensity / Body Part indicator / Heatmap / 年間Calendar等は、実装時に情報量を精査する。Workout履歴探索の範囲を超えて分析画面化しないよう注意する。

---

# 3. Workout Grid

**状態: 最小限の改善のみ採用**

Workout Gridを情報過多にせず、現行の一覧性を維持する。

追加候補:

- Session Count

以下は追加しない。

- Notes Indicator
- Top Exercises Preview
- PR Badge
- Previous Workout Delta
- 同日複数Gymの追加強調表示
- Body Parts Summary

Mobile Layout / Keyboard操作 / Empty Result等の横断UI品質はCommon課題として扱う。

---

# 4. Workout Detail Summary

**状態: 採用**

Workout Detailでは、その日に実施したWorkoutの事実を簡潔に集約する。

採用候補:

- Gym単位のSummary
- Unique Exercise Count
- Total Reps

Body Part別Sets / Volume、Average RIR、Previous Training Day比較、Previous Same Exercise比較、PR Count、Session Duration等は追加しない。

過去との比較・評価をSummaryへ混在させず、当日のWorkout内容を把握するための表示に留める。

---

# 5. Exercise Card

**状態: 採用 / 内容を限定**

Exercise Cardは、その日にそのExerciseで実施したSetを読みやすく確認するための表示とする。

## 採用

- Set表示のTable化
- RIRの表示優先度を下げる
- RIRは必要に応じてClick / Tap等で補助情報として展開する方式を検討
- Performance DetailへのNavigationを強化

## 見送り

- Best Set強調
- Previous Performance
- Weight Delta / Reps Delta
- Exercise Volume Delta
- SetごとのVolume
- Estimated 1RM
- PR Badge
- Exercise History Mini Sparkline

Best Set等を永続的なMaster / Workout Dataとして管理する場合、GitHubへの書き込み責務が発生する可能性がある。GitHubへのMaster Data書き込み機能はWorkout Domainとは分離し、別途検討する新機能画面の責務とする。

---

# 6. Session Compare

**状態: 採用 / 簡易比較に限定**

Workout Detailから、直前Workoutとの概要差分を確認できるようにする。

Performance Detailとの責務分離を優先し、Exercise単位の詳細なPerformance比較は行わない。

表示候補:

- Exercise数の差分
- Set数の差分
- Total Repsの差分
- Added Exercise
- Removed Exercise
- Previous WorkoutへのNavigation

UIはWorkout Detail内の折りたたみ領域またはDrawer等の軽量な表示を優先する。

以下は行わない。

- 任意2日の比較
- Exercise単位のWeight Delta
- Exercise単位のReps Delta
- Exercise Volume Delta
- Body Part Performance Delta
- PR / Strength評価

比較計算はCoreの責務とする。

---

# 7. Notes

**状態: 見送り**

v2.0.0ではNotes機能の追加改善を行わない。

現行表示を維持する。

---

# 8. Navigation

**状態: 採用**

画面遷移によって、それまで閲覧していたWorkoutのContextを失わないことを重視する。

採用候補:

- Previous / Next Workout DayへのNavigation
- Workout Detailから一覧へ戻った際のFilter状態復元
- Workout Detailから一覧へ戻った際のScroll位置復元
- Exercise / Performance Detail等から元Workoutへ戻る明示的な導線
- Calendar / List切替状態の保持

Calendar / Listの表示状態は永続設定とせず、JavaScript側の一時状態等で保持する方向を優先する。

Dashboard / Analyticsへの追加Context Linkは設けない。

---

# 9. Workout固有UI / UX

**状態: 一部採用**

## 採用

- Exercise Cardを折りたたみ可能にする
  - 初期状態は基本的に展開を第一候補とし、必要なCardをユーザーが畳めるようにする

## Super Low / 実装後判断

- Sticky Date Header
  - 実装して実画面を確認し、画面占有や視覚的ノイズが大きい場合は採用しない

## 見送り

- Workout DetailだけHeroをCompact化する変更
  - 他画面との統一感を優先する
- Set数に応じたCompact Mode

Summary Card Responsive / Mobile Horizontal Overflow / Skeleton Loading / Empty・Invalid Date State / Unit表記等はCommon課題として扱う。

---

# 10. Accessibility

**状態: Commonへ分離**

Workout固有Featureとして管理せず、全画面Accessibility改善の一部として扱う。

Workout DomainからCommonへ渡す観点:

- Set List / TableのSemantics
- Filter Label
- Calendar Keyboard Operation
- Comparison Deltaを色だけで表現しない
- Navigation時のFocus Restoration

---

# 11. Core Domain Logic

**状態: 採用機能から逆算して追加**

Coreへ先回りで汎用機能を大量追加せず、今回採用した画面機能に必要なDomain Logicを実装する。

現時点の候補:

- Previous Session Resolver
- Session Comparison
- Total Reps集計
- Calendar Aggregation

Exercise ComparisonはPerformance Detail側の精査時に必要性を判断する。

以下は今回のWorkout Domain起因では追加しない。

- PR Resolver
- Average RIR
- Body Part Session Summary

PR等のWeight比較については、`../BUGFIXES/cross_gym_machine_weight_comparability.md` の既知問題を解決するまで断定的な判定を導入しない。

---

# Commonへ分離する項目

以下はWorkout Domainだけの問題ではなく、全画面を対象とするCommon課題へ統合する。

- Responsive Layout
- Horizontal Overflow
- Loading / Skeleton
- Empty / Invalid State
- Unit表記統一
- Accessibility
- Frontend / Core責務精査

`../common/improvement_candidates.md` を参照。
