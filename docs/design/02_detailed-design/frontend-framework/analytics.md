# Analytics 現行仕様と設計方針

## 責務

Analytics は長期的な Workout の**事実集計**を表示する。Read-only であり Settings / Workout Data を編集しない。

Source: `src/frontend/analytics-svelte/`

Framework: Svelte / TypeScript / Vite / ApexCharts。

Route: `/analytics/`

## Data Access

`@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を使用する。Load issue は Data Load Warning として表示する。

## Period Contract

Global period selector の内部 ID:

```text
7d
28d
month
3m
6m
all
```

これらは内部識別子であり、利用者向け UI は意味が分かる日本語 label を表示する。

特に:

```text
month = 今月（現在のローカル暦月）
```

rolling 30 days の意味ではない。

Custom date range、URL-shared analytics state は現行対象外。

## 表示内容

現行/実装済み集計は以下を含む。

- total session count
- total sets
- total weight / volume
- average session interval
- Workout Trend
- Body Part Balance
- training frequency per week
- machine variety
- body part sets / weight
- body part share / last trained date
- machine frequency ranking
- sessions by gym

各 Widget が global selector 以外の固定期間（例: recent 28 days）を使用する場合、その期間を Widget 上または設計上明示する。

## 事実と評価の境界

Analytics は記録された事実と決定論的集計を表示する。

以下は、明示的な評価モデルが存在しない限り集計値から推論しない。

- 成長している / 停滞している
- 刺激が足りない
- 特定部位が弱い
- 筋肥大に有効 / 無効
- Training quality が良い / 悪い

「回数が多い」「Set数が少ない」「最終実施日が古い」のような測定可能な事実は表示できる。それを良否評価へ変換する場合は別の明示的 Domain model を必要とする。

## Weight / Volume

異種 Machine の Weight / Volume を事実として合計することと、その合計を Performance 指標として比較することを区別する。

Performance 比較・評価では原則として同一 Gym・同一 Machine の比較可能性を維持する。

Machine / Gym が異なる単純合計から「強くなった」等を推論しない。

## Core Use

`workout-core` は以下のような純粋な factual calculation を提供する。

- period range resolution
- inclusive filtering
- previous period / month range
- absolute / percentage delta
- Session / daily / weekly / monthly aggregation
- weekday distribution / monthly training days
- body part distribution
- machine execution frequency
- sessions by gym

Application は同じ計算を独自再実装せず、共通Domain logicを優先する。

## Navigation

Current route ID は `analytics`。Shared navigation と共通UX契約に従う。
