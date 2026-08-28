# v2.0.0 Analytics 改修候補

## 現状
Svelte + ApexCharts。全期間Total Sets/Volume、Training Frequency、Average Interval、Volume Trend、Body Part Sets、直近28日Machine Variety、Body Part Volumeを表示する。

## 1. Period Analysis
- 7d / 28d / Month / 3m / 6m / Year / All
- Custom date range
- Previous period comparison
- Calendar month selector
- 選択期間を全Widgetへ一括適用
- URL queryによる期間共有

## 2. Volume Analytics
- Daily / Session / Weekly / Monthly aggregation
- Body Part stacked volume
- Exercise別volume
- Average session volume
- Median session volume
- Moving average
- Highest volume session
- Period delta

## 3. Frequency / Consistency
- Sessions/week
- Training days/week
- Average interval
- Longest interval
- Current streak
- Longest streak
- Weekday distribution
- Monthly training days
- Calendar heatmap
- Rolling 4-week frequency

## 4. Body Part Analysis
- Sets / Volume / Frequency切替
- Body Part share (%)
- Period comparison
- Body Part trend over time
- Exercise variety by Body Part
- Last trained date by Body Part
- Body Part drill-down

## 5. Exercise Analysis
- Most performed exercises
- Highest volume exercises
- Most improved exercises
- Exercise frequency
- Exercise variety trend
- New exercise adoption
- Exercise concentration / diversity
- Performance Detailへのdrill-down

## 6. Gym Analysis
- Sessions by Gym
- Volume by Gym
- Exercise variety by Gym
- Body Part distribution by Gym
- Gym別recent activity

## 7. RIR Analysis
記録されているsetのみ対象。
- Average RIR
- RIR distribution
- Exercise別RIR
- Period trend
- Missing RIR率

値の意味を過度に解釈せず、記録事実の可視化に留める。

## 8. PR / Progress Analytics
共通PR基盤導入時。
- PR count by period
- PR timeline
- PR by exercise
- Improved exercise count
- First→Latest delta
- e1RM trend aggregation

## 9. Data Quality Analytics
- Runtime session count
- Master resolved / unresolved count
- RIR coverage
- Notes coverage
- Data date range
- Missing/partial records

Developer向け過ぎる場合はSettings/System画面への分離も検討する。

## 10. Chart UX
- Metric selector
- Period selector
- Tooltip detail
- Click drill-down
- Legend toggle
- Export imageは優先度低
- Empty/sparse state
- Chart summary text
- Responsive height
- Large history時のperformance確認

## 11. Analytics Layout
- Summary KPIを選択期間連動
- Section tabs: Overview / Frequency / Body Parts / Exercises / Gyms
- 1画面縦長を維持する案との比較
- Mobileではsection navigation
- Sticky period toolbar

## 12. Domain Logic候補
- period aggregation
- previous period comparison
- streak
- weekday distribution
- gym summary
- exercise ranking
- RIR summary
- PR summary
- rolling average

すべて`workout-core`へ置き、Svelte側は表示責務中心とする。

## 有力候補
1. Global Period Selector
2. Previous Period比較
3. Weekly/Monthly aggregation
4. Consistency/Streak
5. Exercise ranking
6. Gym analysis
7. Body Part trend
8. PR analytics
