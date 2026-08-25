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

## 優先度C: 機能仕様として未実装またはMVP外

### C-1. Page Transition共通化

設計では全Frontendに共通Page Transitionを適用する。

現実装:

- 全画面共通仕様としての整理は未完了。

次にやること:

1. `src/shared/frontend-common/` に共通CSSまたはHelperを置く。
2. 各Frontendへ最小適用する。
3. `prefers-reduced-motion` を確認する。

### C-2. Easter Egg共通機能

設計ではEaster EggのAsset / Voice / Trigger / 表示仕様が定義されている。

現実装:

- MVP実装対象外として未実装。

次にやること:

1. AssetとVoiceデータの確定状態を確認する。
2. 実装する場合は `src/shared/frontend-common/` に共通機能として追加する。
3. 各FrontendへTriggerを統合する。

### C-3. Android Packaging

設計ではAndroid Production Packaging方針が定義されている。

現実装:

- Windows AFのみ実装済み。
- Android Application実装は未着手。

次にやること:

1. Windows版の安定化完了後にAndroid着手可否を判断する。
2. Android AFの対象範囲を改めて定義する。

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

## 明日の推奨作業順

1. `master` 最新状態でREADME手順の再現確認。
2. Production相当FolderでWindows AF起動確認。
3. B-1〜B-3の残課題として、旧 `/api/workout-data` の退役方針を決める。
4. `preview:mpa` を静的配信専用へ戻すか、Preview用互換APIを正式に許容するか判断する。
5. Development RuntimeのError ContractとNode version要件を整理する。
6. C-1 Page Transition共通化に着手する。
7. Navigation共通化、Branding導入準備へ進む。

## 現時点で人間判断が必要な事項

1. 旧 `/api/workout-data` をいつまで互換維持するか。
2. `preview:mpa` を完全なStatic Serve専用へ戻すか、Preview用互換APIを正式に許容するか。
3. 現行 `dev:<domain>` commandを互換維持するか、`watch:<domain>` / Gatewayへ集約するか。
4. Easter Eggを次工程で実装対象に含めるか。
5. Android AFをWindows安定化後すぐ開始するか、別Phaseへ送るか。
