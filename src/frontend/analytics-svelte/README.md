# Analytics Frontend

Svelte + TypeScript + ViteでAnalytics画面を実装しています。

## 担当Route

```text
/analytics/
```

## 主な表示内容

- Monthly Sessions
- Sets / Volume Trend
- Body Part Summary
- Machine Frequency
- PR Trend Placeholder
- Chart表示

## 開発起動

```sh
pnpm run dev:analytics
```

Gateway経由で確認する場合はRepository直下で `pnpm run watch` を実行し、`http://127.0.0.1:5173/analytics/` を開きます。Analyticsの開発Server固定Portは `127.0.0.1:5178` です。

## Build

```sh
pnpm run build
```

統合Buildにより、最終的なProduction Artifactは `dist/analytics/` に配置されます。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
- `@workout-lab/frontend-common`

`@workout-lab/frontend-common` からNavigation、Page Transition、Branding、Character Easter Eggの共通基盤を利用します。
