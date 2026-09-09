# Build and Runtime

## Root Scripts

Root `package.json` は主要な build / validation workflow を定義する。

主要 script:

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

`tools/build/build-mpa.mjs` は production `dist/` layout を作成する。

Copy 対象:

- Portal artifact を `dist/` root へ配置する。
- Error page artifact を `dist/` root へ配置する。
- `src/version.json` を `dist/version.json` へ配置する。
- Dashboard を `dist/dashboard/` へ配置する。
- Workouts を `dist/workouts/` へ配置する。
- Machines を `dist/machines/` へ配置する。
- Analytics を `dist/analytics/` へ配置する。
- Settings を `dist/settings/` へ配置する。
- Resource Management を `dist/maintenance/` へ配置する。

現行 MPA build script が認識するのは、`tools/application-registry.mjs` に定義された Portal と既存 hosted application のみである。

## Development Runtime

Development では local Node runtime と gateway を使用する。

- Development Gateway: `127.0.0.1:5173`
- Portal: `127.0.0.1:5174`
- Dashboard: `127.0.0.1:5175`
- Workouts: `127.0.0.1:5176`
- Machines: `127.0.0.1:5177`
- Analytics: `127.0.0.1:5178`
- Settings: `127.0.0.1:5179`
- Development Runtime API: `127.0.0.1:5180`
- Resource Management: `127.0.0.1:5181`

Node development runtime は repository の `data/master` と `data/workouts` を直接読み取り、local development 用に AF-compatible read API を公開する。Credential storage、GitHub sync、configuration write、native shell lifecycle は実装しない。

## Preview Runtime

`preview:mpa` は build 済み `dist/` のみを serve する。Source file は build しない。

`check:mpa` は `preview:mpa` に対して known production route と expected 404 behavior を validate する。

## Version Management

`tools/version/atlament-version.mjs` は以下を check / update する。

- `src/version.json`
- Windows project metadata
- Android Gradle version metadata

File ごとの手動 version edit は documented update path ではない。
