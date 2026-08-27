# Performance Detail 現行仕様

## Responsibility

Performance Detail は exercise-specific workout history と simple performance indicator を表示する。

Workout Log または Master Data は edit しない。

## Source and Framework

Source:

```text
src/frontend/exercises-angular/
```

Framework:

- Angular
- TypeScript
- ng-apexcharts / ApexCharts

## Routes

```text
/exercises/
/exercises/:id
```

Hosted MPA contract は alphanumeric character、`_`、`-` で構成される exercise ID を認識する。

## Data Access

Performance Detail は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を call する。

Load issue は Data Load Warning として表示される。

## Selection State

現行 application は URL path から selected exercise を derive する。

Data load 後に path exercise ID が invalid の場合、application は first available exercise option または `abdominal` へ fallback し、invalid-parameter flag を set し、`history.replaceState` で browser URL を update する。

Exercise selection は `history.pushState` で URL を update する。

## Current Screen Behavior

現行 Performance Detail は以下を表示する。

- machine/exercise selector
- invalid exercise parameter feedback
- latest date
- Best Weight
- Estimated 1RM
- Total Sets
- recent 28-day average set weight
- Best Weight line chart
- body part
- session count
- Best Weight / Best Reps summary
- Date / Gym / Sets / Best Weight / Best Reps / Volume を持つ workout history table
- link back to Workout Domain

`Best Weight`、`Best Reps`、`Estimated 1RM` という用語は current UI behavior である。

## Core Use

Performance Detail は `workout-core` を以下に使用する。

- exercise options
- exercise history
- max weight
- max reps
- estimated 1RM
- recent sessions
- average set weight
- date/body part/weight formatting

## Navigation

Performance Detail は current route ID `exercises` で shared navigation を受け取る。
