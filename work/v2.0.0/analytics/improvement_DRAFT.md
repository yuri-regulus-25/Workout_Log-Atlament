# v2.0.0 Analytics 改修 DRAFT

## 基本方針
AnalyticsはWorkout Dataの期間・頻度・Body Part・Exercise・Gym傾向を俯瞰する画面とする。評価基準が曖昧なPR / Best / Improved等は導入しない。Weight / Volume系AnalyticsはGym / Machine差を考慮し、原則メインジムのデータへ限定する。

# 1. Period Analysis
## 採用
- 7d / 28d / Month / 3m / 6m / Year / All の固定Period Preset
  - 表示場所はUI設計時に再検討
  - 28dは直近28日、Monthは暦月として区別
- Previous Period Comparison
  - 選択期間の直前にある同一長期間と比較
- Calendar Month Selector
- 選択期間をAnalytics内の全Widgetへ一括適用するGlobal Period Context

## 見送り
- Custom Date Range
- URL Queryによる期間共有

期間状態を保持する必要がある場合はFrontend内部State / Session Storage等を利用し、URIを状態管理Contractにしない。

# 2. Volume Analytics
Weight / Volume系はメインジム限定。

## 採用
- Daily / Session / Weekly / Monthly Aggregation
- Moving Average
- Highest / Max Volume Session
  - 必要に応じてWorkout DetailへDrill-down
- Period Delta
  - Previous Period Comparisonへ統合

## 見送り
- Body Part Stacked Volume
- Exercise別Volume
- Average Session Volume
- Median Session Volume

異なるExercise / Body Part間で重量レンジの異なるVolumeを単純比較しない。

# 3. Frequency / Consistency
## 採用
- Sessions / Week
- Average Interval
- Weekday Distribution
- Monthly Training Days

## 見送り
- Training Days / Week
- Longest Interval
- Current Streak
- Longest Streak
- Calendar Heatmap
- Rolling 4-week Frequency

Streak等の独自評価基準やゲーム的指標は導入しない。

# 4. Body Part Analysis
## 採用
- Sets / Frequency切替
- Body Part Share (%)
  - Sets基準
- Body Part Trend Over Time
  - Sets / Frequency切替
- Last Trained Date by Body Part

## 見送り
- Volume切替
- Period Comparison
- Exercise Variety by Body Part
- Body Part Drill-down

# 5. Exercise Analysis
## 採用
- Most Performed Exercises
  - 実施回数 / Frequency情報を統合
- Performance DetailへのDrill-down

## 見送り
- Highest Volume Exercises
- Most Improved Exercises
- Exercise Variety Trend
- New Exercise Adoption
- Exercise Concentration / Diversity

First → Latest Deltaはv2.0.0では実装せず、十分な長期データが蓄積した将来版で再検討する。

# 6. Gym Analysis
## 採用
- Sessions by Gym

## 見送り
- Volume by Gym
- Exercise Variety by Gym
- Body Part Distribution by Gym
- Gym別Recent Activity

Gym Analysisは過剰に肥大化させず、利用Session数の事実表示に留める。

# 7. RIR Analysis
**v2.0.0では全見送り。**

RIRは入力密度が十分でないため、Analytics基盤へ昇格させない。

# 8. PR / Progress Analytics
**v2.0.0では全見送り。**

- PR Count / Timeline / Exercise別PRは導入しない
- Improvedの独自判定を導入しない
- e1RM Trend Aggregationは導入しない
- First → Latest Deltaは将来再検討

# 9. Data Quality Analytics
**Analyticsから全撤去。**

以下はMaster Data / System側へ移管する。
- Runtime Session / Runtime Data Count
- Master Resolved / Unresolved Count
- Missing / Partial Records
- その他Master Data整備に必要なData Quality情報

RIR Coverage / Notes Coverage / Data Date RangeはAnalytics Metricとして常設しない。

# 10. Chart UX
## 採用
- Metric Selector
- Global Period Selector
- Tooltip Detail
- Drill-down先が明確なData PointのClick / Tap Navigation
- Multi-series時のLegend Toggle

## 見送り / Common
- Export Image: Skip
- Empty State: Common基準
- Sparse Data専用表現: Skip
- Chart Summary Text: Accessibility / Common
- Responsive Height: Common
- Large History Performance: Engineering / Commonで確認

# 11. Analytics Layout
- Summary KPIはGlobal Period Contextへ連動
- v2.0.0では1画面縦長Layoutを維持
- Section Tabsは現時点で導入しない
- Mobile Section Navigationは導入しない
- Sticky Period Toolbarは導入しない

実装後にInformation Densityが過大になった場合のみSection Tabsを再検討する。

# 12. Domain Logic
採用機能に必要なDomain Logicは `workout-core` に集約し、Svelte側は表示・UI State・Navigationを中心とする。

主なCore候補:
- Period Preset解決
- Global Period Filtering
- Previous Period範囲算出 / Delta
- Daily / Session / Weekly / Monthly Aggregation
- Moving Average
- Max Volume Session
- Sessions / Week
- Average Interval
- Weekday Distribution
- Monthly Training Days
- Body Part Sets / Frequency集計
- Body Part Share
- Body Part Trend
- Last Trained Date by Body Part
- Exercise実施回数Ranking
- Sessions by Gym
- メインジムContextを適用したVolume集計

Frontendへ同一Domain計算を重複実装しない。

# 横断前提
- メインジム設定はSystem / Device側で管理
- Weight / Volume系Analyticsは原則メインジム限定
- Data Quality / Master解決状況はMaster Data更新機能側へ移管
- Responsive / Accessibility / Unit / Decimal / Empty State等はCommon基準へ統合
