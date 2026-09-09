# Workouts Frontend

Vue 3 + TypeScript + ViteでWorkout History画面を実装しています。

## 担当Route

```text
/workouts/
/workouts/:date
```

## 主な表示内容

- Workout History
- Workout Detail
- Table sort / pagination
- Chart表示

## 開発起動

```sh
pnpm run dev:workouts
```

Gateway経由で確認する場合はRepository直下で `pnpm run watch` を実行し、`http://127.0.0.1:5173/workouts/` を開きます。Workoutsの開発Server固定Portは `127.0.0.1:5176` です。

## Build

```sh
pnpm run build
```

統合Buildにより、最終的なProduction Artifactは `dist/workouts/` に配置されます。

## Routing

通常のserver経由では設計書通り `/workouts/` と `/workouts/:date` を使います。`file://` 直開き時のみ、ブラウザ制約を避けるためhash routingに自動で切り替えます。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
- `@workout-lab/frontend-common`

`@workout-lab/frontend-common` からNavigation、Page Transition、Branding、Character Easter Eggの共通基盤を利用します。
