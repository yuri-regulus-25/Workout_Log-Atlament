# 技術構成

## 1. 基本思想

本プロジェクトでは、Frontend Framework比較とApplication Runtime分離を両立する。

Frontend Frameworkは交換可能なUI Adapterとして扱い、Runtime Data取得・GitHubアクセス・OS差異はAF側へ隔離する。

## 2. Frontend Framework

| Domain | Framework | 役割 |
| --- | --- | --- |
| Dashboard | React + TypeScript | Summary / Chart / Recent Workouts |
| Workout History / Detail | Vue 3 + TypeScript | 一覧・検索・Session詳細 |
| Performance Detail | Angular + TypeScript | Exercise単位の履歴・分析 |
| Analytics | Svelte + TypeScript | 長期傾向・集計表示 |
| Settings | SolidJS + TypeScript | AF設定・Credential・Status・Manual Sync |

Portalは入口として扱い、設定責務を持たない。

## 3. 共通Frontend層

```text
packages/
├─ workout-types/
├─ workout-core/
├─ workout-data/
├─ design-tokens/
└─ shared-styles/
```

### workout-types

Raw / Normalized Workout Model、Master、AF Interfaceで利用する型を定義する。

### workout-core

Framework非依存の純粋集計関数を保持する。

例:

```ts
getTotalVolume()
getExerciseHistory()
getMaxWeight()
getMaxReps()
getEstimated1RM()
getMonthlySessions()
getMonthlyVolume()
getBodyPartSummary()
```

### workout-data

AF導入後はRaw JSON / JSONLの主Parserではなく、Common JS / AF Clientとの互換窓口としてRuntime `WorkoutSession[]` をFrontendへ提供する。

Raw取得、JSON / JSONL Parse、Technical Validation、Master Resolve、NormalizeはAF責務。

### design-tokens / shared-styles

Framework間の視覚的一貫性を維持する。Framework固有Componentは共有しない。

## 4. Application Framework

AF詳細は `07_af_detailed_design.md` を正とする。

主要技術責務:

```text
AF Common
├─ Orchestration
├─ GitHub Access
├─ Runtime Data
├─ Configuration
├─ Credential
├─ HTTP API
├─ Hosting
├─ Status / Error
└─ Logging
```

### Windows MVP

- .NET / C# 系
- WinForms Host
- localhost HTTP Server
- SQLite logging
- JSON Configuration
- Platform Secure Storage
- Primary Port 14108 / Secondary 45194

### Android MVP

AndroidもMVP対象とする。

- AF Commonの外部仕様をWindowsと共通化
- Android Application固有Storage
- Android Secure Storage
- Android提供のSQLite Database
- localhost HTTP Runtime / Frontend Hosting
- 同一API Contract / Runtime Data Contract / Build済みFrontend Artifactsを利用

Android固有API、Path、LifecycleはPlatform Adapter内部へ閉じ込める。

## 5. AFとFrontendの境界

```text
GitHub SoT
   ↓
AF
   ↓ HTTP
Common JavaScript
   ↓ Call
Frontend Framework
```

FrontendからGitHubへ直接通信しない。FrontendからAF管理Local Resourceへ直接アクセスしない。

## 6. Runtime Storage

- Non-Confidential Configuration: JSON (`af-settings.json`)
- Credential: Platform Secure Storage
- Runtime Data: `current/` + `temporary/`
- Log: SQLiteを中心としたPlatform別実装
- Frontend: Build済みArtifactのみHosting

AFはFrontend Buildを実施しない。

## 7. API

- localhost限定
- 初期API Version: `v1`
- `/api/v1/...` でVersion固定可能
- `/api/...` は提供中の最新Version Alias
- 共通Response: `success / errors / data`

## 8. Build / Repository

Monorepo / workspace構成を維持する。各Frontend Applicationは独立Build可能とし、AFはBuild済み成果物のみをHostingする。

想定Artifact:

```text
portal
 dashboard-react
 workouts-vue
 exercises-angular
 analytics-svelte
 settings-solid
```

## 9. Architecture Rule

> FrontendはUI Adapter、Common JSはAF Interface Adapter、AFはApplication Runtime、GitHubはSoTとして責務を分離する。

Windows / Android差異はAF外部仕様へ漏らさない。
