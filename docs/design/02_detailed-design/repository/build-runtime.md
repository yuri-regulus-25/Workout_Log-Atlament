# Build and Runtime

## Root Scripts

Root `package.json` は主要 build / validation workflow を定義する。

- `npm run build`: Frontend application を build し MPA artifact を assemble。
- `npm run build:apps`: Portal、Error Pages、各 application を build。
- `npm run build:mpa`: `dist/` assemble。
- `npm run preview:mpa`: build 済み `dist/` serve。
- `npm run watch`: development runtime / gateway / frontend dev server 起動。
- `npm test`: Vitest。
- `npm run check:all`: version / Analytics / data / MPA smoke check。
- `npm run build:windows`: Windows distribution。
- `npm run build:android`: Android debug APK。
- `npm run build:android:release`: Android release APK。

- `pnpm run build`: すべての frontend application を build し、MPA artifact を assemble する。
- `pnpm run build:apps`: Portal、Error Pages、各 framework app を build する。
- `pnpm run build:mpa`: `dist/` を assemble する。
- `pnpm run preview:mpa`: build 済みの `dist/` を serve する。
- `pnpm run watch`: development runtime、development gateway、frontend dev server を起動する。
- `pnpm test`: Vitest を実行する。
- `pnpm run check:all`: version check、Analytics check、data check、MPA smoke check を実行する。
- `pnpm run build:windows`: Windows distribution を作成する。
- `pnpm run build:android`: frontend を build し、Android assets へ copy して debug APK を build する。
- `pnpm run build:android:release`: frontend を build し、Android assets を copy して release APK を build する。

## MPA Assembly

現行 `tools/build/build-mpa.mjs` は production `dist/` layout を作成する。

```text
dist/
├─ portal root / error pages / version.json
├─ dashboard/
├─ workouts/
├─ machines/
├─ analytics/
├─ settings/
└─ maintenance/
```

現行 MPA build が認識する Application は `tools/application-registry.mjs` を基準とする。

## Development Runtime

Development:

```text
Gateway                 127.0.0.1:5173
Portal                  127.0.0.1:5174
Dashboard               127.0.0.1:5175
Workouts                127.0.0.1:5176
Machines                127.0.0.1:5177
Analytics               127.0.0.1:5178
Settings                127.0.0.1:5179
Development Runtime API 127.0.0.1:5180
Resource Management     127.0.0.1:5181
```

Node development runtime は repository `data/master` / `data/workouts` を直接読み、local development 用 AF-compatible read API を公開する。

Credential storage、GitHub sync、configuration write、Native lifecycle 等を完全模倣する必要はない。ただし Native AF と同じ endpoint / DTO を提供する箇所は同じ意味論に従う。

## Runtime Contract

Windows / Android Runtime の product behavior は [Runtime Contract Matrix](../application-framework/runtime-contract-matrix.md) を正とする。

Build / packaging の違いを理由に Resource Health、readiness、Recovery、empty state 等の意味を変えない。

Runtime file の物理名や保存 root は Platform Adapter の責務であり、Domain logic は logical storage contract を使用する。

## Preview Runtime

`preview:mpa` は build 済み `dist/` のみを serve する。Source file は build しない。

`check:mpa` は known production route と expected 404 behavior を検証する。

Application Registry から導出できる route / artifact の smoke test は registry を入力として生成し、別の手書き application list を test 内に持たない方向へ寄せる。

## Version Management

`tools/version/atlament-version.mjs` は以下を check / update する。

- `src/version.json`
- Windows project metadata
- Android Gradle version metadata

File ごとの手動 version edit は documented update path ではない。

About 等の表示画面は Version metadata の Source of Truth にならず、共通 Build Metadata contract を読み取る viewer とする。
