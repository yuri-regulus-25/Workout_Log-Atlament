# Atlament 実装指示書 — Repository再編

## 目的

本工程ではRepository Directoryを新Standardへ再編する。

**機能変更を行わないこと。**

設計上の新機能実装は後続工程で行う。

## 参照

- `work/00_overview.md` ～ `work/09_frontend_settings_detailed_design.md`
- `work/10_repository_build_runtime_design.md`

## 実施内容

新しい責務分類へ既存Source / Data / Documents / Toolingを移動する。

```text
src/application/common/
src/application/windows/
src/application/android/
src/frontend/*
src/shared/*
data/
docs/
tools/
```

移動に伴うimport path、npm workspace path、script path、document reference等は機械的に修正する。

## Repository移行Mapping

以下をMVPの移行先として使用する。再編工程では独自判断による再分類・統合・Refactorを行わない。

| 現行Path | 新Path | 扱い |
| --- | --- | --- |
| `apps/dashboard-react/` | `src/frontend/dashboard-react/` | MOVE |
| `apps/workouts-vue/` | `src/frontend/workouts-vue/` | MOVE |
| `apps/exercises-angular/` | `src/frontend/exercises-angular/` | MOVE |
| `apps/analytics-svelte/` | `src/frontend/analytics-svelte/` | MOVE |
| `packages/workout-types/` | `src/shared/workout-types/` | MOVE |
| `packages/workout-core/` | `src/shared/workout-core/` | MOVE |
| `packages/workout-data/` | `src/shared/workout-data/` | MOVE |
| `packages/design-tokens/` | `src/shared/design-tokens/` | MOVE |
| `packages/shared-styles/` | `src/shared/shared-styles/` | MOVE |
| `workouts/` | `data/workouts/` | MOVE |
| `master/` | `data/master/` | MOVE |
| `work/00_...` ～ `work/10_...` | `docs/design/` | MOVE |
| `work/instructions/` | `docs/instructions/` | MOVE |
| `scripts/build-mpa.mjs` | `tools/build/build-mpa.mjs` | MOVE |
| `scripts/check-mpa.mjs` | `tools/validation/check-mpa.mjs` | MOVE |
| `scripts/preview-mpa.mjs` | `tools/dev-runtime/preview-mpa.mjs` | MOVE |
| `scripts/dev-with-workout-data.mjs` | `tools/dev-runtime/dev-with-workout-data.mjs` | MOVE |
| `scripts/workout-data-api.mjs` | `tools/dev-runtime/workout-data-api.mjs` | MOVE |
| `scripts/vite-workout-data-plugin.ts` | `tools/dev-runtime/vite-workout-data-plugin.ts` | MOVE |
| `package.json` | `package.json` | KEEP |
| `package-lock.json` | `package-lock.json` | KEEP |
| `vitest.config.ts` | `vitest.config.ts` | KEEP |
| `.gitignore` | `.gitignore` | KEEP |
| `README.md` | `README.md` | KEEP |
| `hello.txt` | - | DELETE |

### 再編工程で統合しないもの

`shared-styles`、`workout-data` 等は後続工程で責務が変更される可能性があるが、本工程では内容を再設計しない。

```text
packages/shared-styles/
→ src/shared/shared-styles/

packages/workout-data/
→ src/shared/workout-data/
```

移動と参照Path追従のみ行う。

## README.md 配置方針

主要Directoryには、そのDirectoryを初めて見た人が「ここには何が入っているのか」を理解できる簡易 `README.md` を配置する。

READMEは設計書ではない。

記載内容は以下の情報粒度に留める。

- Directoryで管理している資材の概要
- Frontend画面Directoryの場合、その画面で表示・提供する内容の簡単な説明
- 使用Framework等、Directoryを理解するために直接必要な最低限の情報

以下はREADMEへ記載しない。

- 詳細仕様
- 設計
- 責務境界
- 依存関係の設計説明
- 実装規約

全階層へ機械的にREADMEを配置する必要はない。意味のある主要Directoryを対象とする。

例:

```md
# data

Atlamentで使用するデータファイルを管理するディレクトリです。

- `workouts/` : ワークアウト記録
- `master/` : 種目・ジム等のマスターデータ
```

```md
# dashboard-react

Dashboard画面のソースコードを管理するディレクトリです。

Dashboardでは、ワークアウトのサマリーやグラフ、最近のワークアウト情報などを表示します。

React / TypeScriptを使用しています。
```

既存READMEが存在する場合は、新Directory構成に合わせて移動・更新してよい。ただしREADMEを第二の設計書にしない。

## 生成Directory

`atlament/` および `.tmp/` はSource Directoryではなく生成領域とする。

```text
atlament/  Production Artifact
.tmp/      Build一時領域
```

両方ともGit管理対象外とする。

空Directory維持のためだけに大量の `.gitkeep` を追加しない。`src/application/*`、Portal、Error Pages、Settings等の未実装Directoryは後続実装時に作成してよい。

## 再編後の想定Root

```text
/
├─ src/
├─ data/
├─ docs/
├─ tools/
├─ package.json
├─ package-lock.json
├─ vitest.config.ts
├─ README.md
└─ .gitignore
```

## Path追従対象

少なくとも以下を確認し、新Pathへ追従させる。

- `package.json` workspaces
- `package.json` scripts
- import / export path
- path alias
- Vite / Angular / Svelte等のBuild設定
- Test fixture / Data path
- README / Documents内のPath参照
- Script内のRepository Root相対Path

## 許可

- Directory / File移動
- import path修正
- npm workspace path修正
- Build / Script path修正
- README / Document参照Path修正
- 主要Directoryの簡易README追加・更新
- 既存挙動維持に必要な機械的変更

## 禁止

- UI変更
- API変更
- Data Model変更
- Refactor
- 新機能追加
- 既存Packageの責務再設計・統合
- Easter Egg実装
- Page Transition実装
- AF新規実装
- Settings新規実装
- Build / Watch Runtimeの新機能実装
- 無関係なFormatting

## 完了条件

- Mappingに従ってRepositoryが再編されている。
- 主要Directoryに簡易READMEがあり、初見で管理対象を把握できる。
- 既存Check / Testが成立する。
- 既存FrontendがBuild可能である。
- 既存preview相当の動作が維持される。
- Git差分の本質がDirectory移動、Path追従、README整備である。
- 無関係なFormatting / Refactor差分を混入させない。

## Commit

本工程は他工程と混在させず、Repository再編専用Commitとして完結させること。
