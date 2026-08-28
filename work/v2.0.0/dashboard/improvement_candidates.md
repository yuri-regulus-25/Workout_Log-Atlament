# v2.0.0 Dashboard 改修候補

## 目的
`release-2.0.0-planning` の現行Dashboardを基準に、v2.0.0で検討可能な機能追加・UI/UX改善を広く列挙する。採用仕様ではなくDiscovery資料とする。

## 現状
React + ApexCharts。月間Sessions/Sets/Volume/Latest Workout、Volume Trend、Set Count Trend、Training Balance、Latest Workout、Recent Workoutsを表示する。現状は`currentYear=2026`、`currentMonth=8`固定。

## 1. 期間・集計
- 現在年月をRuntime clockから解決し固定値を廃止
- Today / 7d / 28d / Month / 3m / 6m / Year / Allの期間Selector
- Previous period比較
- 月送り・年月Picker
- Training daysとSession数を分離
- Average sets/session、Average volume/session
- Active exercise count、Gym count
- 記録開始日・継続期間
- 前月比・前年同月比
- Rest days / average interval

## 2. Progress / PR
- Recent Improvements
- Recent PR一覧
- Max Weight更新
- Max Reps更新
- Estimated 1RM更新
- Exercise別前回比
- 直近N回の上昇/横ばい/下降
- PR発生日からWorkout Detailへ遷移
- Progress Detail新規画面への入口

PR/Progress演算はDashboard内へ実装せず`workout-core`へ配置する。

## 3. Latest Workout
- Card全体をWorkout DetailへのLink化
- Exercise一覧Preview
- Body Parts表示
- Notes有無
- Previous sessionとの差分
- Sets / Volume / Machinesの前回比
- 同日複数Sessionの扱い改善
- Latest WorkoutからPerformance DetailへのShortcut

## 4. Charts
### Volume
- 表示期間切替
- Total Volume / Sets / Session Volume切替
- Moving Average
- Data point tooltipへ日付・Gym・sets
- Workout Detailへのdrill-down
- zero/empty state改善

### Set Count
- 全履歴ではなく選択期間へ統一
- Session単位 / Week単位切替
- Body Part stack

### Training Balance
- Sets / Volume切替
- 期間切替
- Cardio表示ON/OFF
- Body Part clickからAnalytics filterへ遷移
- 0値部位の表示方針選択

## 5. Consistency
- Training calendar mini heatmap
- Current streak
- Longest streak
- Weekly consistency
- Month内Training Days
- 曜日別頻度

## 6. Recent Workouts
- 表示件数切替
- Gym filter
- Body Part filter
- Exercise filter
- Sort
- Mobile card representation
- Notes indicator
- PR indicator
- PaginationまたはView All
- Calendar ViewへのShortcut

## 7. Personalization（Frontend-local）
- Dashboard Card並び替え
- Card表示/非表示
- Default期間保存
- Chart表示モード保存
- Compact / Comfortable density

Workout SoTには保存せずlocalStorage等のUI preferenceとして扱う。

## 8. Runtime / Data Quality
- Local Fallback中のData freshness表示
- Last Sync表示
- Partial issue件数
- Data range表示
- Master未解決データの存在通知
- Settingsへの導線

## 9. UI/UX
- KPI Cardの情報階層改善
- KPIに前期間deltaを追加
- Hero縮小によるAbove-the-fold改善
- Chart Card高さ統一
- Desktop wide layout再検討
- Tablet 2-column最適化
- Mobileでtable→cards
- Skeleton loading
- Empty state illustration/CTA
- Tooltip用語統一
- kg / sets / sessions表記統一
- Chart legend共通化
- `prefers-reduced-motion`

## 10. Accessibility
- Chartのtext summary/table fallback
- KPI deltaを色だけで表現しない
- Keyboard drill-down
- Screen Reader向けChart summary
- Focus Visible
- Contrast確認

## 11. Developer Experience
- Dashboard-specific aggregateを`workout-core`へ移動
- Period model共通化
- Chart option factory共通化の可否検討（Framework UI Component共有はしない）
- Hard-coded current date廃止
- Data loading / Empty / Warning state test
- Period comparison test
- Responsive smoke test

## 有力候補
1. 固定年月廃止 + Period Selector
2. KPI前期間比較
3. Recent Progress / PR
4. Latest Workout drill-down強化
5. Training calendar / consistency
6. Chart drill-down
7. Mobile recent workout改善
