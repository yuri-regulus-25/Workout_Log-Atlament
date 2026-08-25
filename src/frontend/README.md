# Frontend

画面単位のFrontend Applicationを管理します。

## 構成

```text
src/frontend/
├─ portal/
├─ errors/
├─ dashboard-react/
├─ workouts-vue/
├─ exercises-angular/
├─ analytics-svelte/
└─ settings-solid/
```

Portalは `src/frontend/portal/`、Error Pageは `src/frontend/errors/` のSource Applicationとして管理します。

## 統合Build

Repository直下で実行します。

```sh
npm run build
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
├─ dashboard/
├─ workouts/
├─ exercises/
├─ analytics/
└─ settings/
```

## 開発起動

画面ごとの開発起動はRepository直下から実行します。

```sh
npm run dev:dashboard
npm run dev:workouts
npm run dev:exercises
npm run dev:analytics
npm run dev:settings
```

## Runtime Data接続

各FrontendはWindows AF環境では `/api/v1/common/runtime/workouts` を優先して参照します。Previewや単体開発では既存の開発Runtime endpointをFallbackとして使用します。
