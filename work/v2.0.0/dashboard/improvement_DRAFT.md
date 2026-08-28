# v2.0.0 Dashboard Improvement DRAFT

## Status

Dashboard Discovery一次レビュー・精査後のDRAFT。

## Dashboardの基本思想

Dashboardは「現在どうなっているか」を概要として把握する画面とする。

詳細分析・履歴探索・設定・実行系操作は、それぞれ責務を持つ画面へ委譲する。

Frontend Frameworkは原則として表示とUI interactionを担当し、集計・比較等のDomain LogicはCore側を責務とする。横断的な責務精査はCommon課題として別途実施する。

---

# 1. Current Month Summary + Previous Month Comparison

**Status: Adopted for DRAFT**

## 目的

Dashboardの月次Summaryを「現在月の概要」として維持しつつ、前月との差分を補助情報として表示する。

任意期間を分析する画面にはせず、現在の状態を短時間で把握するDashboardの責務を維持する。

## 基本仕様

- Dashboardの主対象期間はCurrent Monthとする
- Current Monthはruntimeの現在日時から動的に決定する
- 任意月・任意期間を選択するUIは設けない
- 主要KPIにPrevious Monthとの差分を補助情報として表示する
- 前月比較は現在値の意味を補足するためのContextとして扱う

表示対象候補:

- Workouts / Sessions
- Sets
- Volume

表示イメージ:

```text
August 2026

Workouts      5      +1 vs Jul
Sets         42      +8 vs Jul
Volume   38,420 kg   +12.4% vs Jul
```

## 表現上の注意

Workout量の増減そのものを良否として評価しない。

そのため、単純な増加をGreen、減少をRedとするようなPerformance評価表現は原則使用しない。差分は中立的なContextとして表示する。

前月データが存在しない場合や比較不能な場合は、誤解を招く`0%`等を表示せず、比較情報を非表示または`No previous data`相当として扱う。

## 責務分離

Frontend側で月次集計・前月比較ロジックを独自実装しない。

Core側で以下を提供する方向で設計する。

- Current Month集計
- Previous Month集計
- 差分値 / 差分率の算出
- 比較不能状態の判定

FrontendはCoreから受け取った結果をDashboard上に表示する。

## BUGFIXとの関係

現行Dashboardの`2026 / 8` hard-codingは本機能とは別のBugfixとして扱う。

`../BUGFIXES/dashboard_current_month_hardcoding.md` を参照。

Current Monthをruntimeから動的決定することはBugfixとして必須であり、本項の前月比較機能の採否・実装時期には依存しない。

---

# 2. Latest / Recent Workouts Summary

**Status: Adopted for DRAFT**

元候補のLatest WorkoutとRecent Workoutsは、情報と責務の重複を避けるため一つの領域へ統合する。

## 目的

直近のWorkoutをDashboard上で軽く確認し、必要な場合のみWorkout Detailまたは履歴を担当する画面へ遷移できるようにする。

## 基本仕様

- 最新Workoutを領域内で最も目立つ情報として表示する
- 最新Workoutには以下を表示候補とする
  - Date
  - Gym（データが存在する場合。現行表示を維持）
  - Exercise count
  - Set count
  - Exercise names
- Exercise namesは表示上限を設け、超過分は`+N more`等で省略可能とする
- 過去数件のWorkoutはCompactな一覧として同じ領域に表示する
- 各WorkoutからWorkout DetailへNavigationできるようにする
- 履歴全体を確認するためのNavigationを設ける

## 情報量の方針

第一候補は「種目名まで表示する」情報量とする。

超CompactなDate / countのみの表示は縮退案として許容するが、Set単位のWeight / Reps詳細までDashboardへ展開しない。

## 明示的に行わないこと

- Set詳細の展開
- Search
- Gym / Exercise Filter
- Date Range指定
- Sort変更
- Pagination / Load Moreによる履歴探索
- Workout編集 / 削除
- Performance比較
- Personal Best / Achievement判定

詳細な履歴探索はDashboardの責務外とする。

---

# 3. Existing Chart UX Improvement

**Status: Adopted for DRAFT**

新しい分析Chartを追加するのではなく、既存Chartの可読性と詳細画面への導線を改善する。

## 候補

- TooltipへDate / Value / Unit等の必要情報を表示
- Data Pointと単一Workoutの対応が明確な場合、Workout DetailへのNavigationを検討
- Sparse Data時の見え方を改善
- Mobileを含めたChartの可読性調整

## X軸の扱い

**現行のX軸ラベル非表示は意図的なUI設計のため維持する。**

可読性改善を理由にX軸ラベルを追加しない。必要なDate情報はTooltip等で補完する。

## 明示的に行わないこと

- Metric切替
- Moving Average
- Trend Line等の分析追加
- Dashboard内期間Selector
- 分析目的の新規Chart追加

高度な分析はAnalytics等の責務を持つ画面で扱う。

実装後は実画面を目視レビューし、情報量・Tooltip・Navigation・視覚的ノイズを調整する。

---

# 4. Current Month Workout Calendar

**Status: Adopted for DRAFT**

## 目的

Current Month内でWorkoutを実施した日を視覚的に把握できる簡易CalendarをDashboardへ追加する。

Calendarは分析機能ではなくWorkout History Summaryとして扱う。

## 基本仕様

- #1と同じCurrent Monthを表示対象とする
- Workout実施日をCalendar上で視覚的に示す
- Calendar単独の月送り機能は設けない
- Workout日からWorkout DetailへNavigationできる場合は検討する
- 同日に複数Workoutが存在する場合のNavigationは実装設計時に整理する

## Analyticsへ委譲するもの

以下はDashboard Calendarへ搭載しない。

- Streak
- Weekly target / 達成判定
- Training frequency分析
- 曜日別傾向
- 月間比較
- Heatmap
- Rest day分析
- Average interval
- Consistency score

これらを実施する場合はAnalytics側で別途検討する。

---

# Skip / Deferred

## Personal Best / Personal Record

**Status: Skip for Dashboard v2.0.0**

Dashboard専用の対象種目設定等が必要になる可能性があり、表示機能に対して責務・設定が過剰に膨らむ。

さらに、Gym / Machineが異なる場合にraw Weightを直接比較できない既知問題が存在するため、現時点ではPersonal Bestを安全に判定できる前提が確立していない。

`../BUGFIXES/cross_gym_machine_weight_comparability.md` を参照。

比較仕様確立後にPerformance系画面を主責務として再検討する。将来Dashboardへ表示する場合も、FrontendでAchievementを判定せずCoreが確定した結果を表示するだけとする。

## Dashboard Personalization

**Status: Skip**

Widget表示切替・並び替え・Default期間等のDashboard専用設定は導入しない。

現時点では得られる価値に対して状態管理・保存・Responsive Layout等の複雑性が大きく、画面崩れの要因にもなるため採用しない。

## Runtime / Data Quality Widget

**Status: Skip**

Dashboard固有のRuntime / Data Quality表示は追加しない。

DashboardはWorkout状況の概要表示に集中する。

---

# Commonへ分離済み

以下はDashboard単独の改善候補ではなく、全画面を対象とするCommon課題として扱う。

- Cross-Frontend UI / UX Polish
- Accessibility
- Mobile / Responsive Baseline
- Frontend / Core Responsibility Review

`../common/improvement_candidates.md` を参照。
