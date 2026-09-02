# Portal 現行仕様と設計方針

## 責務

Portal は Atlament の入口である。他 Application を起動し、AF status に基づく簡潔な同期・状態通知を表示する。

Portal は Settings、credential、Repository Configuration、Workout Data を編集しない。

## Source

```text
src/frontend/portal/
├─ src/index.html
├─ src/main.js
├─ src/style.css
└─ build.mjs
```

## Framework

Portal は plain HTML、CSS、JavaScript を使用する。React / Vue / Angular / Svelte / Solid では build しない。

## UI

現行 page は以下を提供する。

- Atlament entry header
- Dashboard、Workout Domain、Performance Detail、Analytics、Application Settings、Resource Management の Application card
- framework label
- branding logo behavior
- Character Easter Egg trigger
- synchronization notice

Application 一覧・route metadata は長期的に Application Registry を単一 Source of Truth とし、Portal 独自の手書き一覧を別の正として持たない。

Portal は独自 header を持ち、shared navigation drawer は使用しない。この差異は入口画面としての layout 差であり、Theme / Branding / Application metadata の意味を独自化するものではない。

## Status Notice

現行 `src/frontend/portal/src/main.js` は `GET /api/v1/common/status` を **1500ms ごとに polling** する。

1500ms は現行実装の更新間隔であり、Product Contract ではない。将来 polling interval や event-driven 更新方式を変更しても、利用者に示す状態の意味は維持する。

現行状態:

- loading: startup または manual sync が running
- success: running sync が successful に complete
- warning: Runtime data が required、または `runtimeData.fallbackActive` が true
- error: startup/manual sync failed、または Status API request failed

v2.1.0 以降、Broken Workout Resource が隔離されても利用可能な Runtime が存在する場合は「Runtime data required」と同一視しない。AF が公開する Readiness / Resource Health / Recovery facts に従い、Portal が message や Session 数から状態を再推論しない。

`fallbackActive` と Workout Resource quarantine は別状態である。

Success display は visible period と fade out の後に自動で hidden になる。Warning と error は visible のまま残る。

## Build

`src/frontend/portal/build.mjs` は Portal static assets を build し、MPA assembly に必要な shared branding / theme / Easter Egg resource を copy する。
