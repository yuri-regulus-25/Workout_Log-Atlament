# Phase 11 User-facing Text Inventory - Workout Domain

対象範囲: Workout Domain Vue Appの固定表示文言、検索UI、詳細画面、empty/error text、単位suffix。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| WOD-001 | `Atlament Workouts` | `src/frontend/workouts-vue/src/App.vue:5` | Brand rowのaccessibility label。 |
| WOD-002 | `Atlament / ${pageTitle}` | `src/frontend/workouts-vue/src/App.vue:6` | 上部eyebrow / Easter Egg trigger。 |
| WOD-003 | `Workout Domain` / `Workout Domain - Details` | `src/frontend/workouts-vue/src/App.vue:52-56` | 一覧/詳細のpage title。 |
| WOD-004 | Lead text block | `src/frontend/workouts-vue/src/App.vue:10` | Workout Domain上部説明文。 |
| WOD-005 | `Search Target` / `検索対象` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:7-8` | 一覧検索panel heading。 |
| WOD-006 | Search input | `src/frontend/workouts-vue/src/components/WorkoutFilters.vue:23-26` | Workout検索入力。placeholderはコード上未設定。 |
| WOD-007 | Filter labels generated from options | `src/frontend/workouts-vue/src/components/WorkoutFilters.vue` | Machine / Body Part / Gym / Date range等の検索条件表示。詳細labelはcomponent内DOM定義を参照。 |
| WOD-008 | `Reset` | `src/frontend/workouts-vue/src/components/WorkoutFilters.vue:69` | 検索条件reset button。 |
| WOD-009 | `Data Load Warning` / `データ取得異常` / `データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:29-31`; `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:73-75` | Runtime load warning panel。 |
| WOD-010 | `Workout Calendar` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:39` | Calendar section eyebrow。 |
| WOD-011 | `Workout calendar` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:44` | Calendar gridのaccessibility label。 |
| WOD-012 | `Workout Record` / `ワークアウト記録` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:57-58` | Workout list table section。 |
| WOD-013 | `No Results` / `条件に一致するワークアウトがありません。` / `検索条件を確認してください` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:67-69` | 検索結果0件empty state。 |
| WOD-014 | `Date` / `Gym` / `Machines` / `Sets` / `Volume` | `src/frontend/workouts-vue/src/components/WorkoutGrid.vue:94-98` | Workout grid sortable table headers。sort arrowは`↑`/`↓`。 |
| WOD-015 | `Prev` / `Next` | `src/frontend/workouts-vue/src/components/WorkoutGrid.vue:130-132` | Workout grid pagination buttons。 |
| WOD-016 | `Workouts` / `Total sets` / `${value} kg` | `src/frontend/workouts-vue/src/components/SummaryCards.vue:27-40` | Summary cardsのlabel/value suffix。 |
| WOD-017 | `Row selection` / `Workout detail` | `src/frontend/workouts-vue/src/components/WorkoutDetail.vue:23-24` | 旧/補助detail componentのpanel heading。 |
| WOD-018 | `Select a row to inspect a workout.` | `src/frontend/workouts-vue/src/components/WorkoutDetail.vue:28` | session未選択empty state。 |
| WOD-019 | `Set ${set} · ${weight} kg × ${reps} reps` | `src/frontend/workouts-vue/src/components/WorkoutDetail.vue:61` | set line表示template。 |
| WOD-020 | `Workout navigation` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:85` | 詳細画面prev/next navigationのaccessibility label。 |
| WOD-021 | `${count} session` / `${count} sessions` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:82` | 同日session件数表示。 |
| WOD-022 | `Sets` / `Total Reps` / `kg` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:110-119` | 詳細summary metrics。 |
| WOD-023 | `Session Compare` / `前回セッション比較` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:132-133` | 前回session比較section。 |
| WOD-024 | `Added Machines` / `Removed Machines` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:153-158` | 前回比較の追加/削除Machine表示。 |
| WOD-025 | `Workout Detail` / `ワークアウト詳細 - ${gym}` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:168-169` | session別Workout詳細section。 |
| WOD-026 | `${count} set(s)` / `${count} rep(s)` / `${volume} kg` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:181-183`; `src/frontend/workouts-vue/src/workout-detail-presentation.ts:41` | Machine summary表示template。 |
| WOD-027 | `Reps` / `Weight` / `RIR` / `Failure` / `Warmup` / `Note` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:206-214` | 詳細set table header/fields。実際の全headerは該当table DOMを参照。 |
| WOD-028 | `Notes` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:230` | Session notes section heading。Note本文はWorkout dataなので対象外。 |
| WOD-029 | `記録されていない日を見ようとしたみたい。戻ろう。` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:237` | 該当日Workoutなしのempty state。 |
| WOD-030 | `Back to Workout Domain` | `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:238` | Workout Domain一覧へ戻るlink label。 |
| WOD-031 | `Workout data could not be loaded.` | `src/frontend/workouts-vue/src/views/WorkoutsView.vue:123`; `src/frontend/workouts-vue/src/views/WorkoutDetailView.vue:37` | Runtime loader catch時のfallback error。 |

