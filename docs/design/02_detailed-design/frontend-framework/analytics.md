# Analytics 現行仕様

## Responsibility

Analytics は longer-term aggregate workout view を表示する。

Read-only であり、settings または data は edit しない。

## Source and Framework

Source:

```text
src/frontend/analytics-svelte/
```

Framework:

- Svelte
- TypeScript
- Vite
- ApexCharts

## Route

```text
/analytics/
```

## Data Access

Analytics は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を call する。

Load issue は Data Load Warning として表示される。

## Current Screen Behavior

現行 Analytics は以下を render する。

- total session count
- total sets
- total weight
- average session interval
- total volume の Workout Trend area chart
- sets による Body Part Balance bar chart
- training frequency per week
- recent 28-day machine variety by body part
- body part sets and total weight table

現行 source は global period selector、custom date range、URL-shared analytics state、PR analytics、data quality management を実装していない。
Phase 5-D 以降、global period selector は `7d` / `28d` / `month` / `3m` / `6m` / `all` presets を support する。custom date range、URL-shared analytics state、PR analytics、data quality management は実装していない。

## Core Use

Analytics は `workout-core` を以下に使用する。

- total sets
- total volume
- average session interval
- training frequency per week
- recent sessions
- body part summary
- body part machine variety
- date/body part formatting
- global period filtering
- body part share and last trained date
- machine frequency ranking
- sessions by gym

Phase 5-A 以降、`workout-core` は以下の factual derived logic も提供する。

- `7d` / `28d` / `month` / `3m` / `6m` / `all` period range resolution
- inclusive period filtering
- previous period and previous month range resolution
- absolute delta and percentage delta when previous value is non-zero
- session / daily / weekly / monthly aggregation based on session count, machine count, set count, and rep count
- calendar month range and daily training marker aggregation

Phase 5-C 以降、`workout-core` は以下の training distribution logic も提供する。

- weekday distribution and monthly training days
- sets, frequency, share, trend, and last trained date by body part
- machine frequency ranking by factual execution count
- sessions by gym

## Navigation

Analytics は current route ID `analytics` で shared navigation を受け取る。
