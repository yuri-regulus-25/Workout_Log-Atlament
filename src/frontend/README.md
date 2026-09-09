# Frontend

画面単位のFrontend Applicationを管理します。

## 構成

```text
src/frontend/
├─ portal/
├─ errors/
├─ dashboard-react/
├─ workouts-vue/
├─ machines-angular/
├─ analytics-svelte/
├─ settings-solid/
└─ maintenance-vue/
```

Portalは `src/frontend/portal/`、Error Pageは `src/frontend/errors/` のSource Applicationとして管理します。
Resource Managementは `src/frontend/maintenance-vue/` で管理し、Master Data maintenance、未解決参照、Recovery UIを担当します。

## 統合Build

Repository直下で実行します。

```sh
pnpm run build
```

各FrontendをBuildした後、`tools/build/build-mpa.mjs` が `dist/` にProduction Artifactを集約します。

```text
dist/
├─ index.html
├─ style.css
├─ main.js
├─ common.html
├─ 404.html
├─ 500.html
├─ 503.html
├─ error.css
├─ frontend-common/
├─ dashboard/
├─ workouts/
├─ machines/
├─ analytics/
├─ settings/
└─ maintenance/
```

## 開発起動

画面ごとの開発起動はRepository直下から実行します。

```sh
pnpm run dev:dashboard
pnpm run dev:workouts
pnpm run dev:machines
pnpm run dev:analytics
pnpm run dev:settings
pnpm run dev:maintenance
```

複数FrontendをGateway経由でまとめて確認する場合は以下を使用します。

```sh
pnpm run watch
```

## Runtime Data接続

各FrontendはWindows AF環境では `/api/v1/common/runtime/workouts` を優先して参照します。Previewや単体開発ではDevelopment Runtimeまたは既存の開発Runtime endpointを使用します。

## 共通基盤

Frontend横断のRoute定義、Application metadata、Page Transition、Branding、Character Easter Eggは `src/shared/frontend-common/` を利用します。Framework固有Componentは各Frontend Application側に残します。
