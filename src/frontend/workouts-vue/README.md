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
npm run dev:workouts
```

Repository直下から実行します。画面単体Directoryで作業する場合は、Workspaceの `npm run dev` も使用できます。

## Build

```sh
npm run build
```

統合Buildにより、最終的なProduction Artifactは `dist/workouts/` に配置されます。

## Routing

`vite.config.ts` で `base: './'` を指定しているため、`dist/index.html` は `file://` でも assets を相対パスで参照できます。ただし、通常の確認は `npm run dev` または `npm run prod` を推奨します。

通常の server 経由では設計書通り `/workouts/` と `/workouts/:date` を使います。`file://` 直開き時のみ、ブラウザ制約を避けるため hash routing に自動で切り替えます。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。
