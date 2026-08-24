# Repository Migration Validation Report

作成日: 2026-08-24

## 1. 前提・採用方針

今回の移行では、以下の方針を正として扱った。

- `work/work` は据え置き
- 生成物は移行対象外
- `hello.txt` は移行対象外候補として据え置き
- 空Directoryは作らない
- `package-lock.json` は新しいworkspace構成から再生成
- Conflictなしで移動できるものだけを移動
- 最後にValidationを実施

## 2. 移行後の主要構成

| 種別 | 移行後 |
| --- | --- |
| Frontend apps | `src/frontend/` |
| Shared packages | `src/shared/` |
| Master data | `data/master/` |
| Workout data | `data/workouts/` |
| Design docs | `docs/design/` |
| Instruction docs | `docs/instructions/` |
| Build tools | `tools/build/` |
| Dev runtime tools | `tools/dev-runtime/` |
| Validation tools | `tools/validation/` |
| Existing work area | `work/work/` のまま |

## 3. 移行したもの

### 3.1 Frontend

- `apps/dashboard-react` → `src/frontend/dashboard-react`
- `apps/workouts-vue` → `src/frontend/workouts-vue`
- `apps/exercises-angular` → `src/frontend/exercises-angular`
- `apps/analytics-svelte` → `src/frontend/analytics-svelte`

### 3.2 Shared packages

- `packages/workout-types` → `src/shared/workout-types`
- `packages/workout-data` → `src/shared/workout-data`
- `packages/workout-core` → `src/shared/workout-core`
- `packages/design-tokens` → `src/shared/design-tokens`
- `packages/shared-styles` → `src/shared/shared-styles`

### 3.3 Runtime data

- `master` → `data/master`
- `workouts` → `data/workouts`

### 3.4 Docs / tools

- `work/00_*.md`〜`work/10_*.md` → `docs/design/`
- `work/instructions/*` → `docs/instructions/`
- `scripts/build-mpa.mjs` → `tools/build/build-mpa.mjs`
- `scripts/check-mpa.mjs` → `tools/validation/check-mpa.mjs`
- dev runtime scripts → `tools/dev-runtime/`

## 4. 移行対象外として扱ったもの

- `work/work`
- `hello.txt`
- `dist`
- `node_modules`
- 各Frontend配下の `dist`
- Angular の `.angular`

補足: Validationのためにbuildを実行したため、新配置側にも `src/frontend/*/dist` が生成されている。これは移行対象ではなく生成物。

## 5. 併せて修正した参照

- root `package.json` の workspace を `src/frontend/*` / `src/shared/*` に変更
- root npm scripts を `tools/*` 配下へ変更
- app package の `file:` dependency を `../../shared/*` に変更
- Vite config の workout-data runtime plugin import を `tools/dev-runtime` へ変更
- MPA build / preview / validation script の参照パスを新構成へ変更
- runtime data API の参照先を `data/master` / `data/workouts` へ変更
- 実データtestの参照先を `data/master` / `data/workouts` へ変更
- README と設計書の明らかな物理パスを新構成へ更新
- `.gitignore` に Angular生成物 `.angular` を追加
- Analytics Svelte のbodyPart並び替え型を修正し、`check:analytics` を通過する状態に調整

## 6. package-lock

`package-lock.json` は一度退避したうえで、新しい workspace 構成から再生成した。

- `apps/*` workspace entry: なし
- `packages/*` workspace entry: なし
- 新workspace entry: `src/frontend/*` / `src/shared/*`

## 7. 空Directory確認

移行後に検出された空Directoryは削除済み。

対象例:

- 旧 `scripts`
- 旧 `packages/*` の空残骸
- 新Frontend配下の空 `assets` / `components` / `data` 等
- 旧 `work/instructions`

## 8. Validation結果

以下を実行し、成功を確認した。

```text
npm test
```

結果:

```text
Test Files 4 passed
Tests 34 passed
```

```text
npm run build
```

結果:

```text
workouts-vue build OK
dashboard-react build OK
exercises-angular build OK
analytics-svelte build OK
MPA build OK
```

```text
npm run check:all
```

結果:

```text
svelte-check found 0 errors and 0 warnings
real-data.test.ts 3 passed
MPA smoke check passed: 6 pages + 404
```

MPA smoke対象:

- `/`
- `/dashboard/`
- `/workouts/`
- `/workouts/2026-08-14`
- `/exercises/pec-deck`
- `/analytics/`
- `/unknown` 404

## 9. 注意点

- Git上は大量の rename として見える想定。ただし現時点の `git status --short` は delete/add 表示が中心。
- 旧 `apps/*` / `packages/*` / `workouts/*` / `master/*` は tracked file の削除として表示される。
- 新 `src/` / `data/` / `docs/` / `tools/` は untracked として表示される。
- commit時にGitがrenameとして認識するかは差分検出に依存する。
- 生成物は移行対象外だが、Validation実行によりbuild成果物はローカルに再生成されている。

## 10. 結論

指定方針に従ったRepository移行は完了。

- `work/work` 据え置き: OK
- 生成物非移行: OK
- `hello.txt` 据え置き: OK
- 空Directory削除: OK
- `package-lock.json` 再生成: OK
- Conflictなし移動: OK
- Validation: OK
