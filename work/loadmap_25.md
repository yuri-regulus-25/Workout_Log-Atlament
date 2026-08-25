# loadmap 2026-08-25

## 目的

Windows AF MVP、Frontend Common、Windows配布整備を `master` へ反映した時点で、設計書と実装を比較し、残っている不足・差異・次に着手すべき順序を整理する。

## 現時点の到達点

- Windows AFはDevelop Done扱い。
- WinForms起動、Kestrel localhost Server起動、WebView2表示、Frontend Artifact Hostingは成立。
- Settings Frontendは `dist/settings/` に統合済み。
- GitHub Manual SyncとStartup SyncでRuntime Data生成が成立。
- Dashboard / Workouts / Exercises / AnalyticsはWindows AF Runtime APIを優先参照する。
- Closeボタン、Shutdown API、再起動周辺のST1指摘は修正済み。
- `master ← feature-application-windows` PRはマージ済み。
- Portal / Error PageはSource Applicationとして分離済み。
- `npm run watch` / `watch:<domain>` / Development Gatewayは実装済み。
- Node Development RuntimeはAF互換EnvelopeのMVP APIを実装済み。
- Frontend Common関連作業は完了済み。
- Windows AF配布向けIcon / Assembly metadata / Form名称整理は完了済み。
- Windows x64向け自己完結・単一exe配布Buildは完了済み。
- README群と `BUILD_COMMAND_LINE.md` は現行Build / Runtime / 配布構成に合わせて更新済み。

## 優先度A: Windows配布整備結果

### A-1. Windows AF Application整備

現実装:

- Application Iconを `src/application/windows/Assets/Atlament.ico` に正式配置済み。
- `Atlament.csproj` に `ApplicationIcon` を設定済み。
- WinForms Window左上Iconもexe iconと同一になるよう設定済み。
- テンプレート名 `Form1` は `AtlamentMainForm` へ整理済み。
- Assembly metadataを配布向けに設定済み。
- exe名は `Atlament.exe`。

結果:

- Windows AF Application整備は完了。

### A-2. Windows単体配布Build

現実装:

- root commandとして `npm run build:windows` を追加済み。
- `tools/build/build-windows.mjs` でWindows x64向け配布物を生成する。
- 内部で `npm run build` と `dotnet publish` を実行する。
- publish条件はRelease / win-x64 / self-contained / single-file。
- Frontend Artifactは `Atlament.exe` へ埋め込み済み。
- 配布版では `data/frontend/` を同梱しない。
- 配布出力Rootは `dist-windows/`。

生成物:

```text
dist-windows/
└─ Atlament-v1.0.0-win-x64/
   └─ Atlament.exe
```

確認済み:

- `npm run build:windows` PASS。
- リポジトリ外へ `Atlament.exe` をコピーして起動可能。
- `/`、`/dashboard/`、`/workouts/`、`/exercises/`、`/analytics/`、`/settings/`、`/404.html` がHTTP 200。
- 各JS / CSS / faviconがHTTP 200。
- 配布Folderには `Atlament.exe` のみを配置する。
- 起動後の `data/`、WebView2 User Dataは実行Directory配下に生成される。

結果:

- Windows単体配布Buildは完了。

### A-3. Documentation整備

現実装:

- root READMEを現行構成に合わせて更新済み。
- 各DirectoryのREADMEを更新済み。
- root `BUILD_COMMAND_LINE.md` を追加済み。
- Build / Test / Preview / Development Gateway / Development Runtime / Windows配布Buildの用途を日本語で整理済み。

結果:

- Windows配布前に必要な利用者向け基本説明は完了。

## 優先度B: Development Build / Runtime 整備結果

### B-1. Portal / Error PageのSource分離

現実装:

- Portal Sourceは `src/frontend/portal/` へ分離済み。
- Error Page Sourceは `src/frontend/errors/` へ分離済み。
- 対象Error Pageは `common / 404 / 500 / 503`。
- `tools/build/build-mpa.mjs` はPortal / Error PageのUI文字列生成を行わず、各FrontendのBuild Artifactを `dist/` へ集約する責務に整理済み。
- Production Frontend Artifact Rootは引き続き `./dist/`。

結果:

- B-1は完了。

### B-2. watch系Command / Development Gateway

現実装:

- root `package.json` に `npm run watch` を実装済み。
- `watch:<domain>` を実装済み。
- Development Gatewayは `127.0.0.1:5173` 固定。
- Gateway routeは以下の通り。
  - `/` → Portal `5174`
  - `/dashboard/` → Dashboard `5175`
  - `/workouts/` → Workouts `5176`
  - `/exercises/` → Exercises `5177`
  - `/analytics/` → Analytics `5178`
  - `/settings/` → Settings `5179`
  - `/api/` → Node Development Runtime `5180`
- HTTP proxy / WebSocket proxyを実装済み。
- Port競合時は自動変更せずError終了する。
- 既存 `dev:<domain>` は互換維持している。

残課題:

- `dev:<domain>` は旧 `4317 /api/workout-data` 系Wrapperを利用しており、`watch:<domain>` とRuntime経路が二重化している。
- 日常開発の主経路を `watch` / Gatewayへ寄せるか、旧 `dev:<domain>` を長期互換として残すか判断が必要。

結果:

- B-2はMVP完了。

### B-3. Node Development RuntimeのAF互換API

現実装:

- `tools/dev-runtime/development-runtime.mjs` を実装済み。
- 固定Portは `127.0.0.1:5180`。
- Repository内 `data/` を直接利用し、GitHub / Credential / Configuration管理は行わない。
- `@workout-lab/workout-data` の既存loader/parserを利用し、AF互換Envelopeへ包む。
- 実装済みAPI:
  - `GET /api/v1/common/status`
  - `GET /api/v1/common/runtime/workouts`
  - `GET /api/common/status`
  - `GET /api/common/runtime/workouts`
- 旧 `/api/workout-data` は互換維持している。

残課題:

- 旧 `/api/workout-data` の退役時期を決める。
- `preview:mpa` を静的配信専用へ戻すか、Preview用互換APIを正式に許容するか判断する。
- Master / Workoutディレクトリ欠落時のError Contractが本番AFと完全一致しているか追加確認する。
- Settings系APIはMVPでは未実装。Settings開発でAFなし運用が必要になった段階で追加判断する。

結果:

- B-3はMVP完了。

## 優先度C: Frontend Common / Branding / Easter Egg 整備結果

### C-0. Navigation共通基盤

現実装:

- `src/shared/frontend-common/src/navigation/` に共通Route定義とApplication metadataを実装済み。
- metadataとして `id / route / displayName` を保持する。
- 将来のDrawer Navigationや共通導線の情報源として利用可能な状態。

結果:

- Navigation共通基盤は完了。

### C-1. Navigation参照移行

現実装:

- Dashboard / Workouts / Exercises / Analytics / Settings の固定Route参照を、可能な範囲で `frontend-common` のNavigation定義へ移行済み。
- UI構造、既存Route、Portal導線は維持。

結果:

- 全FrontendのNavigation参照移行は完了。

### C-2. Page Transition共通基盤

現実装:

- `src/shared/frontend-common/src/page-transition/` に共通CSS / 定数 / exportを実装済み。
- 仕様はEntry only、Right to Left、32px、240ms、`cubic-bezier(0.22, 1, 0.36, 1)`。
- `prefers-reduced-motion: reduce` 対応済み。
- React / Vue / Angular / Svelte / Solidへ展開済み。

結果:

- Page Transition共通基盤と対象Frontendへの適用は完了。

### C-3. Branding共通基盤

現実装:

- `src/shared/frontend-common/src/branding/` に正式Logo Asset、Logo variant controller、CSS、exportを実装済み。
- Branding Easter Egg TriggerはLogo SVG click。
- Primary / SecondaryのFull Toggleを行い、状態は `localStorage` に保存する。
- 保存keyは `atlament.system.branding.logoVariant`。
- Portal / Dashboard / Workouts / Exercises / Analytics / Settingsへ展開済み。
- Portal faviconはPrimary Logo固定参照。Secondary Logoへ切り替える仕様は持たせない。

結果:

- Branding共通基盤、Portal実装、React / Vue / Angular / Svelte / Solid展開は完了。

### C-4. Character Easter Egg共通基盤

現実装:

- `src/shared/frontend-common/src/easter-egg/` にCharacter Asset、Voice data、Selection、Trigger controller、Display controller、CSS、exportを実装済み。
- Character Easter Egg TriggerはApplication name textの5クリック。
- Queue、表示、animation、cleanupはFramework非依存controller側で管理する。
- Portal / Dashboard / Workouts / Exercises / Analytics / Settingsへ展開済み。
- Portalおよび対象Frontendは、人間による実ブラウザ画面操作確認済み。

結果:

- Character Easter Egg共通基盤、Portal実装、React / Vue / Angular / Svelte / Solid展開は完了。

### C-5. Error PagesへのBranding / Easter Egg適用

現状:

- 今回対象外。
- Error PagesはSource分離済みだが、Branding / Easter Eggは適用していない。

次にやること:

1. Error Pagesへ正式Logoを表示するか判断する。
2. Error PagesでCharacter Easter Eggを許容するか判断する。
3. 適用する場合はError Pageの責務と非操作画面としての性質を踏まえて別工程で扱う。

## 優先度D: 品質改善

### D-1. WindowsBase警告

`dotnet build/test/publish` で `WindowsBase` の参照競合警告が発生する。

現状:

- Build / Test / PublishはPASS。
- ST1では非ブロッキング扱い。

次にやること:

1. WebView2 Packageの参照内容を確認する。
2. WPF参照が不要なら除外可能か調査する。
3. 変更する場合はWebView2初期化回帰を必ず確認する。

### D-2. Frontend bundle warning

Dashboard / AnalyticsでVite chunk size warning、Exercises Angularでbundle budget warningが発生する。

現状:

- BuildはPASS。
- 非ブロッキング。

次にやること:

1. Chart系依存の分割可否を確認する。
2. 必要ならdynamic importを検討する。
3. 表示速度の実測後に対応優先度を決める。

## 優先度E: 次工程候補

### E-1. 旧Development API整理

対象:

- 旧 `/api/workout-data`
- 旧 `dev:<domain>` wrapper
- `preview:mpa` の互換API提供有無

目的:

- Development Gateway / Development Runtimeを標準開発経路として定着させる。
- 本番AF API Contractと開発Runtimeの差異を減らす。

### E-2. Error Pages Branding適用判断

対象:

- `src/frontend/errors/`
- `dist/common.html`
- `dist/404.html`
- `dist/500.html`
- `dist/503.html`

目的:

- Error PagesへLogoを出すか、Easter Eggを許容するかを決める。
- 非操作画面としての責務を崩さない範囲で検討する。

### E-3. Android Application着手判断

現状:

- Android Applicationは未着手。
- Windows AFとFrontend Commonの主要整備は完了済み。

次にやること:

1. Android AFの対象範囲を定義する。
2. Windows AFと共有できる責務、共有しない責務を整理する。
3. Androidで必要なRuntime / Credential / GitHub Access方針を設計する。

## 次工程の推奨作業順

1. 旧Development API整理方針を決める。
2. `preview:mpa` の責務を静的配信専用に戻すか、互換API込みで正式化するか判断する。
3. Error PagesへのBranding / Easter Egg適用可否を判断する。
4. WindowsBase warningとFrontend bundle warningを品質改善として扱うか、次Releaseへ送るか決める。
5. Android ApplicationのScope定義へ進む。

## 現時点で人間判断が必要な事項

1. 旧 `/api/workout-data` をいつまで互換維持するか。
2. `preview:mpa` を完全なStatic Serve専用へ戻すか、Preview用互換APIを正式に許容するか。
3. 現行 `dev:<domain>` commandを互換維持するか、`watch:<domain>` / Gatewayへ集約するか。
4. Error PagesへBranding / Easter Eggを適用するか。
5. Android AFを次工程として開始するか、別Phaseへ送るか。
