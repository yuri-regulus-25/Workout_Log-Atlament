# Atlament 実装指示書 — Build / Development Runtime

## 目的

Repository再編完了後、Production Build / Preview / Development Watch / Node Development Runtimeを責務分離して実装する。

## 参照

- `work/10_repository_build_runtime_design.md`

## Production

```text
npm run prod
```

Check → Production Build → Assemble → Artifact Validationを実行し、最終Frontend Artifactを `./atlament/` へ生成する。

途中成果物は `.tmp/prod/` を利用し、不完全な `atlament/` を完成品として残さない。

## Preview

```text
npm run preview:mpa
```

Build済み `./atlament/` のみをStatic Serveする。Build / HMR / AF起動 / GitHub Accessを行わない。

## Development

```text
npm run watch
```

全Frontend Development ServerとNode Development Runtimeを起動し、Gateway `5173` から全画面へアクセス可能にする。

個別:

```text
npm run watch:portal
npm run watch:dashboard
npm run watch:workouts
npm run watch:exercises
npm run watch:analytics
npm run watch:settings
```

## Node Development Runtime

Node Development RuntimeはAFの開発版ではなく、Frontend開発用の薄いHTTP Adapterとして実装する。

```text
data/
↓
shared loader / validator
↓
Node Development Runtime
↓
AF互換Response Envelope
```

Data加工・ValidationをDev Runtimeへ重複実装しない。

MVP API subset:

```text
GET /api/v1/common/status
GET /api/v1/common/runtime/workouts
GET /api/common/status
GET /api/common/runtime/workouts
```

Repository内 `data/` を直接利用する。

実装しないもの:

- GitHub API Access
- Token / Credential
- Clone / Pull
- AF Configuration
- SQLite
- Runtime Cache
- Dev専用API Contract
- Settings / Credential / Sync API（MVP）

Master不整合等はAFと同じResponse Contractで返し、補完しない。

## 固定Port

```text
Gateway       5173
Portal        5174
Dashboard     5175
Workouts      5176
Exercises     5177
Analytics     5178
Settings      5179
Dev API       5180
```

Port競合時はError終了し、自動Port変更しない。

## Production Packaging

Windows Production配布物はFolder単位とする。

```text
atlament/
├─ Atlament.exe
└─ data/
   ├─ configuration/
   ├─ runtime/
   ├─ logs/
   └─ frontend/
```

Repositoryで生成したFrontend ArtifactはPackaging時に `data/frontend/` へ配置する。

Installer / User Directoryへの自動配置 / Shortcut / UninstallerはMVP対象外。

AndroidはFrontendをApplication package assetsへ同梱し、Configuration / Runtime DataはApplication Internal Storage、LogはApplication-owned SQLiteを利用する。FrontendをInternal Storageへ展開する機構はMVPでは作らない。

## 禁止

- `watch` と `preview:mpa` の責務統合
- `preview:mpa` 内Build
- `watch` で `atlament/` を利用
- Development RuntimeにAF起動を要求
- Node Development RuntimeへのAF責務追加
- 各FrontendへDevelopment専用API Contract分岐を追加
- MVPでInstaller / Android Frontend展開機構を追加

## 完了条件

- `watch` で1 Portから全画面を利用可能。
- `watch:<domain>` が個別に動作する。
- Node Development Runtimeが薄いAF互換Adapterとして動作する。
- `prod` 成功時に完全な `atlament/` が生成される。
- `preview:mpa` は生成済み `atlament/` のみを表示する。
- Development / Artifact / AFの障害切り分けが可能である。

## Commit

Repository再編Commitとは分離し、本工程専用Commitとすること。
