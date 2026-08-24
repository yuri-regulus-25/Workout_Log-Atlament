# Exercises Frontend

Angular + TypeScriptでPerformance Detail画面を実装しています。

## 担当Route

```text
/exercises/
/exercises/:id
```

## 主な表示内容

- 種目別Latest
- Best Weight
- Estimated 1RM
- Session Count / Total Sets
- Progress Chart
- Machine History
- Workout Historyへの戻りLink

## 開発起動

```sh
npm run dev:exercises
```

Repository直下から実行します。画面単体Directoryで作業する場合は、Workspaceの `npm run start` も使用できます。

## Build

```sh
npm run build
```

統合Buildにより、AngularのBuild Artifactは `dist/exercises/` に配置されます。

## Favicon

Angularのfaviconは `public/favicon.svg` を使用します。PortalのBuilt with表示も `dist/exercises/favicon.svg` を参照します。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
