# Phase 11 User-facing Text Inventory - Portal

対象範囲: Portal画面固有の固定文言。共有Application metadataから生成されるCard文言はCommonにも記録。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| POR-001 | `Portal — Atlament` | `src/frontend/portal/src/index.html:6` | Browser/WebView title。 |
| POR-002 | `Atlament Portal` | `src/frontend/portal/src/index.html:15` | Brand rowのaccessibility label。 |
| POR-003 | `Toggle Atlament logo variant` | `src/frontend/portal/src/index.html:16` | Portalロゴ切替buttonのaccessibility label。 |
| POR-004 | `Atlament / Portal` | `src/frontend/portal/src/index.html:19` | Portal上部eyebrow / Easter Egg trigger。 |
| POR-005 | `Browse, Explore, Analyze.` | `src/frontend/portal/src/index.html:21` | Portal hero sub-heading。 |
| POR-006 | `What do you want to explore?` | `src/frontend/portal/src/index.html:22` | Portal hero heading。 |
| POR-007 | `ワークアウトの履歴、種目ごとの記録、蓄積したデータの分析へ。` | `src/frontend/portal/src/index.html:24` | Portal hero説明。 |
| POR-008 | `GitHubからデータを取得しています。` | `src/frontend/portal/src/index.html:29`; `src/frontend/portal/src/main.js:33,36` | sync notice初期/同期中表示。 |
| POR-009 | `Applications` | `src/frontend/portal/src/index.html:31` | Portal Card gridのaccessibility label。 |
| POR-010 | `同期済みデータがありません。設定情報と同期情報を確認してください。` | `src/frontend/portal/src/main.js:39` | Runtime Data required時のwarning notice。 |
| POR-011 | `取得に失敗しました。既存Runtime Dataで継続利用中です。${suffix}` | `src/frontend/portal/src/main.js:44` | fallbackActive時のwarning notice。`suffix`は` 最終生成: ${generatedAt}`。 |
| POR-012 | ` 最終生成: ${generatedAt}` | `src/frontend/portal/src/main.js:43` | fallback noticeに追加される最終生成日時の固定prefix。日時形式はAF値をそのまま使用。 |
| POR-013 | `同期データを取得できませんでした。` | `src/frontend/portal/src/main.js:47` | startup/manual sync failure時のerror notice。 |
| POR-014 | `同期ステータスを確認できませんでした。` | `src/frontend/portal/src/main.js:54` | status API確認失敗時のerror notice。 |
| POR-015 | `同期データを取得しました。` | `src/frontend/portal/src/main.js:74` | sync成功後のsuccess notice。 |
| POR-016 | `Built with` | `src/frontend/portal/src/main.js:156` | Portal Cardのframework表示prefix。 |
| POR-017 | Framework names: `React`, `Vue.js`, `Angular`, `Svelte`, `SolidJS`, `Vue.js + Vuetify` | `src/shared/frontend-common/src/navigation/application-registry.js:18,29,40,51,62,73` | Portal Cardで表示される各Appの実装framework名。 |
| POR-018 | App card title/category/pointer strings | `src/shared/frontend-common/src/navigation/application-registry.js:13-73` | Portal Cardに表示される各Application名、カテゴリ、説明。詳細は`00-common.md`のCOM-002からCOM-014。 |

