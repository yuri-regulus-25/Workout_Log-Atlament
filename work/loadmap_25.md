# loadmap 2026-08-25

## 目的

Windows AF MVPを `master` へ取り込んだ時点で、設計書と実装を比較し、残っている不足・差異・次に着手すべき順序を整理する。

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

## 優先度A: 次に必ず確認する項目

### A-1. README手順での人間再現確認

今回READMEを拡充したため、記載手順どおりに別作業者が製造できるか確認する。

確認順:

1. `npm ci`
2. `npm run build`
3. `dotnet build src/application/windows/Atlament.sln`
4. `dotnet test src/application/windows/Atlament.sln`
5. Visual Studio Debug起動
6. Settings設定
7. Manual Sync
8. 各Frontend表示

### A-2. Production相当Folderでの資材配置確認

READMEに記載したProduction相当の配置手順を実際に確認する。

確認対象:

- `dist/` の内容が `<exe directory>/data/frontend/` へ配置されること
- `/settings/` を含む全routeがWindows AFから表示できること
- `data/configuration/`
- `data/runtime/`
- `data/logs/`
- CredentialがFrontendやLogへ露出しないこと

## 優先度B: Development Build / Runtime 整備結果

### B-1. Portal / Error PageのSource分離

`docs/design/10_repository_build_runtime_design.md` では、PortalとError PagesはSource Applicationとして分離する方針になっている。

現実装:

- Portal Sourceは `src/frontend/portal/` へ分離済み。
- Error Page Sourceは `src/frontend/errors/` へ分離済み。
- 対象Error Pageは `common / 404 / 500 / 503`。
- `tools/build/build-mpa.mjs` はPortal / Error PageのUI文字列生成を行わず、各FrontendのBuild Artifactを `dist/` へ集約する責務に整理済み。
- Production Frontend Artifact Rootは引き続き `./dist/`。

残課題:

- `src/frontend/portal/` / `src/frontend/errors/` のREADMEとroot READMEの記述が実装結果と完全一致しているか継続確認する。
- Error PageのVisual / routeは現状維持しているため、今後Branding導入時に正式Asset方針と合わせて再確認する。

次にやること:

1. C系作業へ進む前に、Portal / Error PageがBuild Script生成へ戻っていないことを回帰確認する。
2. Branding導入時に、Portal / Error Page / favicon / Windows iconのAsset配置規則をまとめて確認する。

推奨:

- B-1は完了扱い。追加変更はC系またはBranding工程で扱う。

### B-2. watch系Command / Development Gateway

`docs/design/10_repository_build_runtime_design.md` では `npm run watch`、`watch:<domain>`、Development Gateway構成が定義されている。

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
- C系で共通Frontend化を進める前に、日常開発の主経路を `watch` / Gatewayへ寄せるか、旧 `dev:<domain>` を残すか整理が必要。
- Angularは `--serve-path /exercises/` 指定でGateway配下表示を成立させているため、Angular更新時はbase / asset pathを重点回帰する。

次にやること:

1. C系作業前に、`watch` をFrontend開発の標準手順としてREADMEへ明記する。
2. 旧 `dev:<domain>` の位置づけを「互換維持」か「削除予定」か決める。
3. HMR / route / asset 200確認をC系変更ごとの回帰項目に入れる。

推奨:

- B-2は完了扱い。次は旧dev経路の整理方針を決める。

### B-3. Node Development RuntimeのAF互換API

設計上、Node Development RuntimeはAF互換Response Envelopeを返す薄いAdapterとする。

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

- 旧 `/api/workout-data` がDevelopment Runtime / preview / Vite plugin / `dev:<domain>` に残っている。
- `preview:mpa` は設計上 `dist/` のStatic Serveのみだが、現実装では旧 `/api/workout-data` も提供している。
- Master / Workoutディレクトリ欠落時のError Contractが本番AFと完全一致しているか追加確認が必要。
- `src/shared/workout-data/src/node.ts` は `./index.ts` を直接importしており、Node version依存があるため、READMEまたはpackage設定でNode要件を明確にする必要がある。
- Settings系APIはMVPでは未実装。Settings開発でAFなし運用が必要になった段階で追加判断する。

次にやること:

1. 旧 `/api/workout-data` の退役時期を決める。
2. `preview:mpa` を静的配信専用へ戻すか、Preview用互換APIを正式に許容するか判断する。
3. data欠落 / Master破損 / Raw invalid / Master Resolve FailureのDevelopment Runtime挙動を本番AF Contractと照合する。
4. Development Runtimeのsmoke testを追加するか判断する。

推奨:

- B-3はMVP完了扱い。ただし旧API互換の整理はC系へ進む前に方針決定する。

## 優先度C: Frontend Common / Branding / Easter Egg 整備結果

### C-0. Navigation共通基盤

現実装:

- `src/shared/frontend-common/src/navigation/` に共通Route定義とApplication metadataを実装済み。
- 最低限のmetadataとして `id / route / displayName` を保持する。
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

### C-6. Windows配布整備 / README / exe配布確認

現状:

- Windows AFはDevelop Done扱い。
- Frontend Common関連作業は完了。
- 次工程として、Android着手前にWindows配布手順と資材配置を固める必要がある。

次にやること:

1. Windows Production相当Folderへ `dist/` を `<exe directory>/data/frontend/` として配置する手順を再確認する。
2. root READMEおよび関連Directory READMEに、Windows版の製造・配置・起動・確認手順を追記または補強する。
3. exe配布単位でPortal / Dashboard / Workouts / Exercises / Analytics / Settings / frontend-common assetsが表示できることを確認する。
4. Credential / Runtime / Logs / Configurationの配置と初回起動手順をREADMEへ反映する。

推奨:

- 次工程はWindows配布整備を優先する。Android Applicationはその後に着手する。

### C-7. Android Application

現状:

- Android Applicationは未着手。
- Windows配布整備完了後に、Android AFの対象範囲を改めて定義する。
## 優先度D: 品質改善

### D-1. WindowsBase警告

`dotnet build/test` で `WindowsBase` の参照競合警告が発生する。

現状:

- Build / TestはPASS。
- ST1では非ブロッキング扱い。

次にやること:

1. WebView2 Packageの参照内容を確認する。
2. WPF参照が不要なら除外可能か調査する。
3. 変更する場合はWebView2初期化回帰を必ず確認する。

### D-2. Vite chunk size warning

Dashboard / Analyticsでchunk size warningが発生する。

現状:

- BuildはPASS。
- 非ブロッキング。

次にやること:

1. Chart系依存の分割可否を確認する。
2. 必要ならdynamic importを検討する。
3. 表示速度の実測後に対応優先度を決める。

## 次工程の推奨作業順

1. Windows配布整備に着手する。
2. root READMEと関連Directory READMEへ、Windows版の製造・資材配置・起動・確認手順を網羅的に追記する。
3. Production相当Folderで、`dist/` から `<exe directory>/data/frontend/` への配置と起動確認を行う。
4. exe配布単位でPortal / Dashboard / Workouts / Exercises / Analytics / Settings / frontend-common assetsの表示を確認する。
5. 旧 `/api/workout-data`、`preview:mpa` の互換API、Development RuntimeのError Contractを整理する。
6. Windows配布整備完了後、Android Applicationの着手可否と対象範囲を判断する。

## 現時点で人間判断が必要な事項

1. 旧 `/api/workout-data` をいつまで互換維持するか。
2. `preview:mpa` を完全なStatic Serve専用へ戻すか、Preview用互換APIを正式に許容するか。
3. 現行 `dev:<domain>` commandを互換維持するか、`watch:<domain>` / Gatewayへ集約するか。
4. Error PagesへBranding / Easter Eggを適用するか。
5. Android AFをWindows配布整備後すぐ開始するか、別Phaseへ送るか。
