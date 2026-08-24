# Repository Migration Recheck

作成日: 2026-08-24

対象Repository:

```text
C:\Users\guxtu\Documents\repos\Test_repo
```

参照指示:

```text
C:\Users\guxtu\Downloads\REPOSITORY_MIGRATION_INSTRUCTION.md
```

## 1. リチェック結果サマリ

ソースコード最新化後に、Repository構成・主要Path参照・生成物混在・移行対象を再確認した。

現時点では、前回調査から大きな構成変更はない。

- `apps/` は現行Frontend app群として存在
- `packages/` は現行shared package群として存在
- `workouts/` はWorkout実データとして存在
- `master/` はMasterデータとして存在
- `work/00_*.md` ～ `work/10_*.md` は設計書として存在
- `work/instructions/` は実装指示書として存在
- `work/work/` は分類要確認の作業メモ/ロードマップ類として存在
- `scripts/` はbuild / dev-runtime / validation用途が混在
- `dist/`, `apps/*/dist`, `node_modules`, `apps/*/node_modules`, `.angular` などの生成物/依存物がRepository内に存在

Git worktreeはcleanだった。

## 2. 現行主要Directory

```text
apps/
  analytics-svelte/
  dashboard-react/
  exercises-angular/
  workouts-vue/

packages/
  design-tokens/
  shared-styles/
  workout-core/
  workout-data/
  workout-types/

master/
  exercises.json
  gyms.json

workouts/
  2026/03/*.json
  2026/04/*.json
  2026/05/*.json
  2026/06/*.json
  2026/07/*.json
  2026/08/*.json | *.jsonl

work/
  00_overview.md
  01_screens.md
  02_technology.md
  03_data_design.md
  04_development_plan.md
  05_data_validation_policy.md
  06_json_creation_rules.md
  07_af_detailed_design.md
  08_common_js_detailed_design.md
  09_frontend_settings_detailed_design.md
  10_repository_build_runtime_design.md
  instructions/
  work/

scripts/
  build-mpa.mjs
  check-mpa.mjs
  dev-with-workout-data.mjs
  preview-mpa.mjs
  vite-workout-data-plugin.ts
  workout-data-api.mjs
```

## 3. 現行package.json確認

現在のworkspace定義:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

主要script:

```text
build
build:apps
build:mpa
check:analytics
check:all
check:data
check:mpa
dev:analytics
dev:dashboard
dev:exercises
dev:workouts
prod:analytics
prod:dashboard
prod:exercises
prod:workouts
preview:mpa
test
```

前回調査時点との差分として、`check:all` が存在することを確認した。

## 4. 移動計画

指示書のMappingに従う場合、以下を基本移動計画とする。

| 現在Path | 移動先 | 判定 | 理由 |
| --- | --- | --- | --- |
| `apps/dashboard-react/` | `src/frontend/dashboard-react/` | MOVE | Dashboard / React |
| `apps/workouts-vue/` | `src/frontend/workouts-vue/` | MOVE | Workout Domain / Vue |
| `apps/exercises-angular/` | `src/frontend/exercises-angular/` | MOVE | Performance Detail / Angular |
| `apps/analytics-svelte/` | `src/frontend/analytics-svelte/` | MOVE | Analytics / Svelte |
| `packages/workout-types/` | `src/shared/workout-types/` | MOVE | 共通TypeScript型 |
| `packages/workout-core/` | `src/shared/workout-core/` | MOVE | 集計・派生値計算 |
| `packages/workout-data/` | `src/shared/workout-data/` | MOVE | JSON / JSONL loader・normalize |
| `packages/design-tokens/` | `src/shared/design-tokens/` | MOVE | Design tokens |
| `packages/shared-styles/` | `src/shared/shared-styles/` | MOVE | 共通CSS |
| `workouts/` | `data/workouts/` | MOVE | Workout実データ |
| `master/` | `data/master/` | MOVE | Masterデータ |
| `work/00_*.md` ～ `work/10_*.md` | `docs/design/` | MOVE | 設計書 |
| `work/instructions/` | `docs/instructions/` | MOVE | 実装指示書 |
| `scripts/build-mpa.mjs` | `tools/build/build-mpa.mjs` | MOVE | build用途 |
| `scripts/check-mpa.mjs` | `tools/validation/check-mpa.mjs` | MOVE | validation用途 |
| `scripts/preview-mpa.mjs` | `tools/dev-runtime/preview-mpa.mjs` | MOVE | preview runtime |
| `scripts/dev-with-workout-data.mjs` | `tools/dev-runtime/dev-with-workout-data.mjs` | MOVE | dev runtime |
| `scripts/workout-data-api.mjs` | `tools/dev-runtime/workout-data-api.mjs` | MOVE | runtime data API |
| `scripts/vite-workout-data-plugin.ts` | `tools/dev-runtime/vite-workout-data-plugin.ts` | MOVE | dev/runtime plugin |

## 5. Path Reference修正計画

Directory移動に伴い、以下の機械的Path修正が必要。

### 5.1 root package.json

修正対象:

```text
workspaces
scripts
```

想定修正:

```text
apps/*       → src/frontend/*
packages/*   → src/shared/*
scripts/...  → tools/...
packages/workout-data/src/real-data.test.ts
             → src/shared/workout-data/src/real-data.test.ts
```

### 5.2 package-lock.json

修正対象:

```text
apps/*
packages/*
file:../../packages/*
resolved path
workspace package path
```

注意:

`package-lock.json` は手修正より、移動後に `npm install` / `npm install --package-lock-only` 相当で再生成する方が安全な可能性がある。

ただし、Dependency変更は禁止のため、lock再生成時にversion差分が出ないことを確認する必要がある。

### 5.3 vitest.config.ts

現行:

```ts
include: ['packages/**/*.test.ts']
```

移動後:

```ts
include: ['src/shared/**/*.test.ts']
```

### 5.4 Frontend app package.json

現行例:

```text
file:../../packages/workout-core
```

移動後想定:

```text
file:../../shared/workout-core
```

理由:

app移動先が `src/frontend/<app>` で、shared package移動先が `src/shared/<package>` となるため。

### 5.5 Vite config

対象:

```text
apps/dashboard-react/vite.config.ts
apps/workouts-vue/vite.config.ts
apps/analytics-svelte/vite.config.ts
```

現行:

```ts
import { workoutDataPlugin } from '../../scripts/vite-workout-data-plugin.ts'
```

移動後想定:

```ts
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'
```

### 5.6 runtime data path

対象:

```text
scripts/preview-mpa.mjs
scripts/workout-data-api.mjs
scripts/vite-workout-data-plugin.ts
```

現行:

```text
master
workouts
```

移動後:

```text
data/master
data/workouts
```

### 5.7 MPA build source path

対象:

```text
scripts/build-mpa.mjs
```

現行:

```text
apps/dashboard-react/dist
apps/workouts-vue/dist
apps/exercises-angular/dist/exercises-angular/browser
apps/analytics-svelte/dist
```

移動後:

```text
src/frontend/dashboard-react/dist
src/frontend/workouts-vue/dist
src/frontend/exercises-angular/dist/exercises-angular/browser
src/frontend/analytics-svelte/dist
```

### 5.8 check-mpa self reference

対象:

```text
scripts/check-mpa.mjs
```

現行:

```js
['scripts/preview-mpa.mjs']
```

移動後:

```js
['tools/dev-runtime/preview-mpa.mjs']
```

### 5.9 documents

設計書・実装指示書内に現行Path参照がある。

対象例:

```text
work/00_overview.md
work/03_data_design.md
work/06_json_creation_rules.md
work/07_af_detailed_design.md
work/10_repository_build_runtime_design.md
work/instructions/*.md
work/work/loadmap.md
```

Directory移動に伴うPath参照修正は許可されているが、本文意味・仕様・設計判断は変更しない。

## 6. Conflict / Duplicate / 要確認事項

### 6.1 `work/work/` 配下

対象:

```text
work/work/loadmap.md
work/work/2026-08-20_fix.md
work/work/2026-08-20_will_fix.md
work/work/2026-08-24_AF_todo.md
```

状況:

指示書の明示Mappingに含まれていない。

候補:

```text
docs/instructions/
docs/design/
docs/work/
docs/notes/
```

ただし、目標Directoryには `docs/work/` や `docs/notes/` は定義されていない。

判定:

```text
要確認
```

推奨:

今回の機械的移動では移動せず、未解決事項として残す。

### 6.2 build artifacts / cache / dependency artifacts

対象:

```text
dist/
apps/*/dist/
apps/exercises-angular/.angular/
node_modules/
apps/*/node_modules/
packages/*/node_modules/
```

状況:

Repository内に存在する。

判定:

```text
削除候補 / 要確認
```

理由:

build成果物・framework cache・依存物である可能性が高く、新Repository移行資産としては通常正本ではない。

ただし、指示書の削除Policyにより独断削除は禁止。

### 6.3 `hello.txt`

対象:

```text
hello.txt
```

状況:

root直下に存在。

判定:

```text
要確認
```

理由:

責務不明。移行Mappingに該当しない。

### 6.4 現行に存在しない目標Directory

目標Directoryにはあるが、現行資産として確認できないもの:

```text
src/application/common/
src/application/windows/
src/application/android/
src/frontend/portal/
src/frontend/errors/
src/frontend/settings-solid/
src/shared/frontend-common/
```

判定:

```text
要確認
```

推奨:

現行資産がないため、この工程では空Directoryを作成しない。

### 6.5 Easter Egg関連

現行Repository内で Easter Egg の実装・asset・voice は確認できなかった。

指示書上の想定配置:

```text
src/shared/frontend-common/easter-egg/
```

判定:

```text
移動対象なし
```

注意:

新規追加は禁止。

## 7. 削除候補

削除は未実施。

削除候補:

```text
dist/
apps/*/dist/
apps/exercises-angular/.angular/
node_modules/
apps/*/node_modules/
packages/*/node_modules/
```

理由:

build artifact / cache / dependency artifact の可能性が高い。

参照有無:

- `dist/` は README と build / preview script から参照されるが、build成果物として再生成可能な可能性が高い
- `apps/*/dist` は `build-mpa.mjs` の集約元として参照されるが、各app buildで再生成可能
- `node_modules` はnpm installで再生成可能
- `.angular` はAngular cacheの可能性が高い

削除した場合の影響:

- build前のpreviewやMPA確認は不可になる
- npm install / app build / MPA build を再実行すれば復旧可能な可能性が高い

ただし、削除Policyにより、削除する場合はユーザー判断が必要。

## 8. Validation方針

移動前の調査段階では、Validationは未実行。

移動実施後に最低限実行する想定:

```text
npm test
npm run build:apps
npm run build:mpa
npm run check:mpa
npm run check:all
```

補足:

現行 `package.json` には `check:all` が存在する。

## 9. 新Repository移行可否

現時点判定:

```text
READY_WITH_NOTES
```

理由:

- 主要資産の移動Mappingは明確
- 機械的Path修正で対応できる箇所が多い
- Git worktreeはclean
- Workout / Master Data内容変更は不要
- Source Logic変更は不要な見込み

ただし、以下の未解決事項がある。

- `work/work/` 配下の移動先
- `dist` / `node_modules` / `.angular` の扱い
- `hello.txt` の扱い
- 空の目標Directoryを作成するかどうか
- `package-lock.json` を手修正するか再生成するか

## 10. 推奨次アクション

次に実作業へ進む場合、以下の方針を推奨する。

1. `work/work/` は今回は移動しない
2. `dist` / `node_modules` / `.angular` / `hello.txt` は削除せず残す
3. Conflictのない主要資産のみ移動する
4. import / workspace / script / runtime data path を機械的に修正する
5. `package-lock.json` は可能ならlock再生成で整合させる。ただしversion差分が出ないことを確認する
6. Validationを実行する
7. 最終報告で未解決事項を列挙する

## 11. 今回のエクスポートで変更したもの

このMarkdownファイルのみ作成。

```text
work/work/repository_migration_recheck.md
```

Directory移動・Source変更・Data変更・設計本文変更は未実施。
