# 開発計画

## 1. 現在地点

既存Frontend（React / Vue / Angular / Svelte）と共通Packageは実装済み。今後はApplication Framework導入を中心にRuntime構成へ移行する。

詳細仕様:

- AF: `07_af_detailed_design.md`
- Common JS: `08_common_js_detailed_design.md`
- Frontend / Settings: `09_frontend_settings_detailed_design.md`

## Phase A — AF Foundation

- Common / Platform Layer分割
- Operation State
- Configuration JSON
- Credential Secure Storage
- Health / Status
- Unified Shutdown
- Single Instance

完了条件: Windows / Android双方でAF CommonとPlatform Adapter境界が成立する。

## Phase B — Runtime Data / GitHub

- GitHub Read Only Access
- Resource Configuration
- JSON / JSONL Parse
- Technical Validation
- Master Resolve
- Local `current` / `temporary`
- Startup Sync / Manual Sync
- Local Fallback
- Sync Set全体Reject

## Phase C — HTTP / Hosting

- localhost 14108 / 45194
- API v1 + latest alias
- Status / Runtime / Sync / Configuration / Credential / Shutdown API
- Build済みFrontend Artifact Hosting
- 個別Artifact欠落時Degraded

## Phase D — Common JS Migration

- AF Client
- Response validation
- Timeout
- Error mapping
- `loadRuntimeWorkoutSessions()`をAF Runtime Dataへ切替

既存Frontendから直接HTTP事情を意識させない。

## Phase E — Settings / SolidJS

- `/settings/`
- AF Status
- Repository / Resource Configuration
- Timeout
- Credential
- Manual Sync
- Error表示

## Phase F — Existing Frontend Migration

React / Vue / Angular / Svelteの既存UIを維持しつつ、Runtime Data取得元をAFへ統一する。

- Dashboard
- Workouts
- Workout Detail
- Performance Detail
- Analytics

現在の画面仕様は`01_screens.md`を正とする。

## Phase G — Windows MVP

- WinForms Host
- Windows Platform Adapter
- SQLite Integrated Log
- error / fatal_error File
- Single Instance
- Lifecycle / Dispose
- Build済みFrontend配置

## Phase H — Android MVP

Androidを後続候補ではなくMVP対象とする。

- Android Host
- Android Platform Adapter
- Application固有Storage
- Secure Credential Storage
- Android SQLite Logging
- localhost HTTP Server
- Windows版と同一API Contract
- Windows版と同一Runtime Data Contract
- 同一Build済みFrontend ArtifactsのHosting

OS差異を理由にCommon JS / Frontend変更を要求しないこと。

## Phase I — Integration Test

- Windows起動 / 終了
- Android起動 / 終了
- Startup Sync
- Manual Sync
- Remote failure → Local Fallback
- Master missing通知
- INVALID Sync Set Reject
- Configuration破損
- Credential不在
- Port conflict
- Artifact部分欠落
- API version alias
- 既存5画面 + Settingsの動作

## 実装ルール

- 設計書にない機能を独自追加しない。
- GitHub Write禁止。
- Runtime Build禁止。
- FrontendにAF責務を移さない。
- Common JSにOS固有処理を入れない。
- Windows / Androidの外部仕様を分岐させない。
- 不明値を捏造しない。

## MVP完了

Windows / Android AF、Common JS、Settings、既存Frontendが同一Runtime Contract上で動作し、GitHub SoTとLocal Fallbackを利用できること。
