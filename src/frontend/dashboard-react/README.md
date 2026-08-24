# Dashboard Frontend

React + TypeScript + ViteでDashboard画面を実装しています。

## 担当Route

```text
/dashboard/
```

## 主な表示内容

- 月次Summary
- 最新Workout
- 最近のWorkout
- 種目Shortcut
- Training Frequency
- Chart表示

## 開発起動

```sh
npm run dev:dashboard
```

Repository直下から実行します。画面単体Directoryで作業する場合は、Workspaceの `npm run dev` も使用できます。

## Build

```sh
npm run build
```

統合Buildにより、最終的なProduction Artifactは `dist/dashboard/` に配置されます。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
