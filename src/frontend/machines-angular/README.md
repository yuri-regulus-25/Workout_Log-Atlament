# Machines Frontend

Angular + TypeScriptでPerformance Detail画面を実装しています。

## 担当Route

```text
/machines/
/machines/:id
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
pnpm run dev:machines
```

Gateway経由で確認する場合はRepository直下で `pnpm run watch` を実行し、`http://127.0.0.1:5173/machines/` を開きます。Machinesの開発Server固定Portは `127.0.0.1:5177` です。

## Build

```sh
pnpm run build
```

統合Buildにより、AngularのBuild Artifactは `dist/machines/` に配置されます。Production buildでは `/machines/` をbase hrefとして使用します。

## Favicon

Angularのfaviconは `public/favicon.svg` を使用します。PortalのBuilt with表示も `dist/machines/favicon.svg` を参照します。

## Runtime Data

Windows AF環境では `/api/v1/common/runtime/workouts` から同期済みRuntime Dataを取得します。

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
- `@workout-lab/frontend-common`

`@workout-lab/frontend-common` からNavigation、Page Transition、Branding、Character Easter Eggの共通基盤を利用します。
