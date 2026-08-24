# Workout Lab — Overview

## 1. 目的

筋力トレーニングの生ログを会話から構造化し、GitHub 上の JSON / JSONL を正本（SoT）として蓄積する。Web Application は閲覧・分析を主目的とし、Workout の登録・編集 UI は持たない。

本プロジェクトは実用品であると同時に、複数 Frontend Framework と Application Framework（AF）の比較・学習環境でもある。

## 2. 全体構成

```text
Workout
  ↓ 会話で記録
ChatGPT
  ↓ 構造化・確定時 commit
GitHub SoT
  ├─ workouts/**/*.json | .jsonl
  └─ master/*.json
        ↓ Read Only
Application Framework (AF)
  ├─ Remote Sync
  ├─ Validation / Master Resolve
  ├─ Local Runtime Data
  ├─ Credential / Configuration
  ├─ localhost HTTP API
  └─ Build済み Frontend Hosting
        ↓ HTTP
Common JavaScript
        ↓ Call
MPA Frontend
```

AF の詳細は `07_af_detailed_design.md`、共通 JS は `08_common_js_detailed_design.md`、Frontend / Settings は `09_frontend_settings_detailed_design.md` を正とする。

## 3. 基本方針

- GitHub 上の Workout / Master Data を SoT とする。
- GitHub 操作は Read Only。
- 1日1sessionは JSON、同日複数sessionは JSONL。
- Runtime Data は AF が取得・検証・正規化し、Local Runtime Dataを維持する。
- Remote利用不能時は利用可能なLocal Runtime DataへFallbackする。
- FrontendからGitHubへ直接通信しない。
- JSON / JSONL の形式差異、Master Resolve、技術ValidationはAF内で吸収する。
- 集計・演算ロジックはUI Frameworkから分離し `workout-core` へ置く。
- Framework間でUI Componentは共有しない。
- 型、共通API Client、純粋関数、design tokenは共有可能。
- Frontend BuildとRuntime Dataを分離する。
- AFはFrontend Buildを実行しない。

## 4. Frontend Applications

```text
/                  Portal / Entry
/dashboard/         React
/workouts/          Vue 3
/workouts/:date     Vue 3
/exercises/:id      Angular
/analytics/         Svelte
/settings/          SolidJS
```

Portalは入口に限定し、設定責務を持たない。Settingsは独立Applicationとする。

## 5. AF Runtime

MVPではWindows版とAndroid版の両方を対象とする。

```text
Windows AF Host
  ↓
AF Common
  ↓
Windows Platform Adapter

Android AF Host
  ↓
AF Common
  ↓
Android Platform Adapter
```

外部HTTP Interface、Runtime Data Contract、Frontend ArtifactはOSによらず共通とする。OS固有差異は各Platform Adapter内部で吸収する。

## 6. MVP

MVP完了条件:

1. Workout JSON / JSONL とMaster DataをGitHub SoTとして管理できる。
2. Windows AFが起動し、GitHub同期、Local Fallback、HTTP API、Frontend Hostingを提供できる。
3. Android AFが同一外部仕様で起動し、同一Build済みFrontend ArtifactsとRuntime Dataを提供できる。
4. Common JSがAF APIを統一的に利用できる。
5. Dashboard / Workouts / Workout Detail / Performance Detail / Analytics がAF Runtime Dataで動作する。
6. Settings / SolidJSからAF設定、Credential、Status、Manual Syncを操作できる。
7. AF異常・Master未登録等をFrontendへ通知可能である。

## 7. 非目標

- WebからのWorkout登録・編集
- 複数ユーザー対応
- 外部公開用Web API
- GitHub Write
- RuntimeでのFrontend Build
- 過剰なリアルタイム同期
- 設計書にないCache / Retry / Convenience Feature

## 8. 文書構成

- `00_overview.md`: 全体概要
- `01_screens.md`: 現行画面仕様
- `02_technology.md`: 技術構成
- `03_data_design.md`: データ設計
- `04_development_plan.md`: 現在地点からの開発計画
- `05_data_validation_policy.md`: Validation方針
- `06_json_creation_rules.md`: Raw JSON / JSONL作成ルール
- `07_af_detailed_design.md`: AF詳細設計
- `08_common_js_detailed_design.md`: Common JS詳細設計
- `09_frontend_settings_detailed_design.md`: Frontend / Settings詳細設計
