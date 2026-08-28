# v2.0.0 Performance Detail 改修候補

## 現状
Angular + ng-apexcharts。Exercise選択、履歴、Best Weight、Best Reps、Estimated 1RM、直近28日Average Set Weight、Best Weight trendを提供する。

## 1. Exercise Selection
- Search
- Body Part filter
- Recently viewed
- Recently trained
- Alphabetical / Body Part / Frequency sort
- Exercise favorite（Frontend-local）
- URL routeを維持したselection UX改善
- Invalid ID時のfallback説明改善

## 2. Performance Metrics
- Latest Weight / Reps
- Previous Weight / Reps
- Best Set
- Best Volume Session
- Total sessions
- Total reps
- Total volume
- Average reps/set
- Average RIR
- Training frequency
- Days since last performed
- First / latest record
- PR count

## 3. Progress Comparison
- Latest vs Previous
- Latest vs 28d average
- Latest vs Personal Best
- First vs Latest
- Period-over-period
- Weight / reps / volume / e1RM delta
- Plateau / improving / decliningを事実ベースのTrendとして表示

Recommendation文は別責務とし、まず計算結果のみ扱う。

## 4. Charts
- Best Weight
- Average Weight
- Max Reps
- Session Volume
- Estimated 1RM
- Sets
- RIR
- Multi-series切替
- Metric selector
- Period selector
- Data point click→Workout Detail
- PR marker
- Moving average
- Zoom（長期データ時）

## 5. History Table
- Date / Gym / Sets / Best Weight / Max Reps / Volume / RIR
- Sort
- Period filter
- Row→Workout Detail
- PR indicator
- Mobile card representation
- Pagination

## 6. Set-level History
- 各Session展開で全set表示
- Weight×reps
- RIR
- Best set強調
- Previous sessionとのset構成比較

## 7. Personal Records
- Max Weight
- Max Reps at Weight
- Estimated 1RM
- Session Volume
- Total Reps/session
- PR history timeline
- Record更新日

## 8. Exercise Metadata
Master Dataから取得可能なら以下を表示。
- Body Part
- Exercise Name
- Machine / category metadata
- aliases等

Masterに存在しないRuntime ExerciseではUnknownとして表示し、履歴自体は失わない。

## 9. UI/UX
- Metric Card優先順位整理
- Hero compact化
- ChartとHistoryの視線移動改善
- Sticky exercise selector
- Mobile selector改善
- Empty exercise state
- Sparse data時のChart表現
- Units/decimal rules統一
- Tooltip改善
- Skeleton loading

## 10. Accessibility
- Chart summary
- History table semantics
- selector keyboard operation
- delta表現を色だけに依存させない
- PR icon accessible label

## 11. Domain Logic候補
`workout-core`へ以下を集約する。
- exercise previous performance
- PR resolver
- best set
- best session volume
- e1RM history
- average RIR
- total reps
- progression series
- period comparison

## 有力候補
1. Metric Selector付きProgress Chart
2. Latest / Previous / Best比較
3. PR History
4. 詳細History Table
5. Workout Detail drill-down
6. Period Selector
7. Exercise search/filter
