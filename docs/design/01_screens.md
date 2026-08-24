# 画面構成 — Current Spec

本書は現行Frontendソースを正としてリバースエンジニアリングした画面仕様を記録する。候補ではなく、現実装を基準とする。

## 1. Portal / Entry

Path: `/`

責務は各Applicationへの入口に限定する。AF設定やCredential管理は持たない。Settingsへの導線のみ提供する。

## 2. Dashboard — React

Path: `/dashboard/`

目的: 現在のトレーニング状態を短時間で把握する。

現行表示:

- Monthly workouts
- Monthly sets
- Monthly volume
- Latest workout
- 直近28session相当のVolume Trends area chart
- 全sessionのSet Count Trends bar chart
- 当月Body Part別Training Balance bar chart
- Latest Workout詳細カード
- Recent Workouts 5件テーブル
- Data Load Warning
- Analytics / Workout Detail / Workout Domainへの導線

グローバルNav: Portal / Dashboard / Workouts / Analytics。

## 3. Workout History — Vue 3

Path: `/workouts/`

目的: Workout Sessionを日付軸で一覧・検索する。

現行表示・操作:

- Search Target Machine
- Machine filter
- Workout Record一覧
- Session選択からWorkout Detailへ遷移
- Data Load Warning

一覧内部では日付、Gym、Machine、Set、Volume等のRuntime Workout情報を利用する。

## 4. Workout Detail — Vue 3

Path: `/workouts/:date`

目的: 指定日の1件または複数Sessionを完全に確認する。

現行表示:

- 日付 / Session数
- Machines / Sets / Volume / Sessions の4 Summary Cards
- SessionごとのGym
- Exercise名 / Body Part / Exercise Volume
- Set number / weight / reps / RIR
- Session Notes
- Performance Detailへの導線
- 存在しない日付の場合のBack導線
- Data Load Warning

同日複数Sessionを許容する。

## 5. Performance Detail — Angular

Path: `/exercises/:id`

目的: 特定Machine / Exerciseの成長・履歴を確認する。

現行表示・操作:

- Machine selector
- URLのExercise IDと選択状態の同期
- 不正Exercise ID時のParameter Errorとfallback表示
- Latest
- Best Weight
- Estimated 1RM
- Total Sets
- 直近28日 Avg. Set Weight
- Best Weight Progress line chart
- Body Part / Session count / Best Weight / Max Reps summary
- Workout History table: Date / Gym / Sets / Best Weight / Best Reps / Volume
- Workout Domainへの戻り導線
- Data Load Warning

Machine List専用画面は現時点で作らない。

## 6. Analytics — Svelte

Path: `/analytics/`

目的: Session・Exercise単位では見えない長期傾向を分析する。

現行表示:

- Sessions
- Total Sets
- Total Weight
- Average Session Interval
- Workout Volume Trend area chart
- Body Part Set Balance bar chart
- Training Frequency / week
- 直近28日のBody Part別Machine Variety table
- Body Part別Sets / Total Weight table
- Dashboardへの戻り導線
- Data Load Warning

## 7. Settings — SolidJS

Path: `/settings/`

独立Applicationとして新規実装する。Portalへ設定責務を持たせない。

1画面を以下のSectionに分割する。

### AF Status

- Application Status
- Component Status
- Operation Status
- Required Actions
- AF Version

### Repository

- owner
- repository
- ref
- rootPath
- Save
- Remote Source変更時のGitHub導通確認結果

### Resources

- type
- path
- resourceKind
- required
- emptyAllowed
- Add / Edit / Remove

Resource TypeはAF定義済み値のみ選択可能。

### Timeout

- GitHub Request Timeout
- Sync Operation Timeout
- General API Timeout
- Shutdown Timeout
- 単位はsec

### Credential

機密情報であることをIcon等で明示する。

- GitHub Token: mask表示。既存値はAPIから取得しない
- Token Limit Date
- configured / state

### Operations

- Manual Sync
- Sync中Button disable
- Sync成功 / Local Fallback / Error情報表示

## 8. 共通UI原則

- 各Frameworkは独立Componentを持つ。
- Design Token / Shared Stylesにより別Siteに見えない程度の一貫性を維持する。
- AF / Common JSのError情報は各Frameworkが人間向けに表示する。
- Runtime Data欠落・Master未登録等を隠蔽しない。
- Settings以外の画面はAF設定を編集しない。
- Global NavigationはApplication間遷移を提供する。

## 9. 後続候補

- Machine List `/exercises/`
- Calendar
- Body Measurements
- Personal Records横断画面
- Gym Analysis
- 開発・診断専用System画面

これらはMVP対象外。SettingsのAF管理責務と重複するSystem/Data画面は、独立した診断価値が確認できた場合のみ追加する。
