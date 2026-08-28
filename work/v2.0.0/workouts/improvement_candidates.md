# v2.0.0 Workout Domain 改修候補

## 現状
Vue + Vue Router。TopではMachine filterとWorkout Grid、`/workouts/:date/`では同日Sessionをまとめ、Machines/Sets/Volume/SessionsとExercise sets、RIR、Notesを表示する。

## 1. Workout一覧
- Machine以外にBody Part / Gym / Date Range filter
- 複数条件filter
- Search text
- Newest/Oldest/Volume/Sets sort
- Filter reset
- Filter状態をURL queryへ反映
- Filter件数表示
- Pagination / virtualized list検討
- 年/月Group
- Sticky filter

## 2. Calendar View
- List / Calendar切替
- Month calendar
- Training day marker
- Session count
- Volume intensity表示
- Body Part indicator
- Day click→Detail
- Month送り
- Today shortcut
- Heatmap表示
- 年間Calendar

Calendarは新規ApplicationではなくWorkout Domain内Viewとする案を優先する。

## 3. Workout Grid
- Notes indicator
- Body Parts summary
- Top exercises preview
- PR badge
- Previous workout delta
- Session count
- 同日複数Gym表示
- Mobile card layout
- Row keyboard navigation
- Empty result改善

## 4. Workout Detail Summary
- Gym別summary
- Body Part別sets/volume
- Exercise countではなくunique exercise countとの区別
- Session duration（将来データが存在する場合）
- Previous training day比較
- Previous same-exercise session比較
- PR count
- Total reps
- Average RIR（記録済みsetのみ）

## 5. Exercise Card
- Best set強調
- Previous performance表示
- Weight delta / reps delta
- Exercise volume delta
- Estimated 1RM
- PR badge
- RIR視覚化
- Set table化
- SetごとのVolume
- Performance Detail link強化
- Exercise history mini sparkline

## 6. Session Compare
- Previous workoutとの比較
- 任意2日比較
- 共通Exerciseのみ比較
- Added / Removed exercise
- Sets / reps / weight / volume delta
- Body Part balance delta
- Compare専用ViewまたはDetail内drawer

## 7. Notes
- Session Notesのvisual hierarchy改善
- Note count
- Notesを一覧でもindicator表示
- 長文折返し
- 将来structured noteが増えた場合の表示拡張余地

## 8. Navigation
- Previous / Next workout day
- Back to list時にfilter/scroll復元
- Exercise Detail→Workoutへ戻る導線
- Dashboard / Analyticsへのcontext link
- Calendar/List切替を保持

## 9. UI/UX
- HeroをDetailではcompact化
- Summary Card responsive
- Exercise Card折りたたみ
- Set数が多い場合のcompact mode
- Mobile horizontal overflow除去
- Sticky date header
- Skeleton loading
- Empty / invalid date state改善
- units表記統一

## 10. Accessibility
- Set list/table semantics
- Filter label
- Calendar keyboard operation
- Comparison deltaを色だけに依存させない
- Focus restoration

## 11. Domain Logic候補
`workout-core`へ以下を追加候補とする。
- previous session resolver
- session comparison
- exercise comparison
- PR resolver
- total reps
- average RIR
- body part session summary
- calendar aggregation

## 有力候補
1. List / Calendar View
2. 複合Filter
3. Previous/Next navigation
4. Exercise previous-performance比較
5. Session Compare
6. PR表示
7. Mobile Detail改善
