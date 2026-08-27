# Dashboard 現行仕様

## Responsibility

Dashboard は現在の workout situation を概観表示する。

Detailed history explorer ではなく、Workout Data を edit しない。

## Source and Framework

Source:

```text
src/frontend/dashboard-react/
```

Framework:

- React
- TypeScript
- Vite
- ApexCharts through `react-apexcharts`

## Route

```text
/dashboard/
```

## Data Access

Dashboard は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を call する。

Load issue は Data Load Warning として表示する。

## Current Screen Behavior

現行 Dashboard は以下を render する。

- monthly workout count
- monthly set count
- monthly volume
- latest workout date
- recent session の Volume Trends area chart
- Latest Workout card
- Set Count Trends bar chart
- current month body part sets の Training Balance bar chart
- Workout Detail への link を持つ Recent Workouts table

Current month は `workout-core` の `getCurrentLocalYearMonth()` により、runtime local calendar month に基づいて resolve される。

## Core Use

Dashboard は `workout-core` を以下に使用する。

- monthly sessions
- monthly volume
- recent sessions
- total sets
- total volume
- body part summary
- display date formatting
- workout rows

## Navigation

Dashboard は current route ID `dashboard` で shared navigation を受け取る。

Recent workout row は以下へ link する。

```text
/workouts/<date>/
```

## Styling

Dashboard は shared styles に加えて `src/frontend/dashboard-react/src/App.css` と `index.css` を使用する。
