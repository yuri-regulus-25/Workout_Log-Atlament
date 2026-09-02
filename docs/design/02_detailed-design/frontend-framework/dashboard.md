# Dashboard 現行仕様と期間契約

## 責務

Dashboard は Workout の現在状況を概観表示する。詳細履歴 explorer ではなく、Workout Data を編集しない。

Source: `src/frontend/dashboard-react/`

Framework: React / TypeScript / Vite / react-apexcharts。

Route: `/dashboard/`

## Data Access

`@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を使用する。Load issue は Data Load Warning として表示する。

## Widget と期間

Dashboard 全体に暗黙の単一期間を仮定しない。各 Widget がどの期間の事実を表示するかを明示する。

| Widget / Metric | Period Contract |
|---|---|
| Workout Count | current local calendar month |
| Set Count | current local calendar month |
| Volume | current local calendar month |
| Workout / Set comparison | current month vs previous calendar month |
| Latest Workout Date | latest available Session |
| Latest Workout | latest available Session |
| Recent Workouts | latest N Sessions。Nは表示仕様 |
| Volume Trends | recent Session window defined by widget |
| Set Count Trends | widget-defined trend period |
| Training Balance | current local calendar month |

`month` は rolling 30 days ではなく current local calendar month を意味する。

Widget 固有期間を変更する場合は、その Widget の契約として明示し、「Dashboardだから全部今月」と推測させない。

## Core Use

Dashboard は `workout-core` の決定論的集計を使用する。

- monthly sessions / volume
- recent sessions
- total sets / volume
- body part summary
- previous month range
- factual delta
- period range resolution
- daily / weekly / monthly aggregation

Dashboard は集計結果から、根拠となるモデルなしに成長・不足・刺激・効果・良否を推論しない。

Weight / Volume を Performance 比較へ使う場合は同一 Gym・同一 Machine の比較可能性原則に従う。

## Navigation

Current route ID は `dashboard`。

現行 Recent Workout row は `/workouts/<date>/` へ link する。これは Date navigation policy であり Workout Domain Identity を Date とする契約ではない。

将来 Session detail / edit を直接指す場合は `session_id` を明示的に識別できる route を使用する。

## Styling

Shared styles に加え Application 固有 CSS を使用する。Cross-framework interaction semantics は共通UX契約へ従う。
