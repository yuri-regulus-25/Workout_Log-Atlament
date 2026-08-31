# Portal 現行仕様

## Responsibility

Portal は Atlament の entry surface である。他 application を launch し、AF status に基づく小さな synchronization/status notice を表示する。

Portal は settings、credentials、repository configuration、Workout Data を edit しない。

## Source

```text
src/frontend/portal/
├─ src/index.html
├─ src/main.js
├─ src/style.css
└─ build.mjs
```

## Framework

Portal は plain HTML、CSS、JavaScript を使用する。React/Vue/Angular/Svelte/Solid では build されない。

## UI

現行 page は以下を提供する。

- Atlament entry header
- Dashboard、Workout Domain、Performance Detail、Analytics、Application Settings、Resource Management の application card
- framework label
- branding logo behavior
- Character Easter Egg trigger
- synchronization notice

Portal は独自 header を持ち、shared navigation drawer は使用しない。

## Status Notice

`src/frontend/portal/src/main.js` は `GET /api/v1/common/status` を 1500ms ごとに poll する。

Current state:

- loading: startup または manual sync が running
- success: running sync が successful に complete
- warning: runtime data が required、または `runtimeData.fallbackActive` が true
- error: startup/manual sync failed、または Status API request failed

Success display は visible period と fade out の後に自動で hidden になる。Warning と error は visible のまま残る。

## Build

`src/frontend/portal/build.mjs` は Portal static assets を build し、MPA assembly に必要な shared branding/theme/easter-egg resource を copy する。
