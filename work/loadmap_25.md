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

## 優先度B: 設計と実装の差異

### B-1. Portal / Error PageのSource分離

`docs/design/10_repository_build_runtime_design.md` では、PortalとError PagesはSource Applicationとして分離する方針になっている。

現実装:

- `tools/build/build-mpa.mjs` がPortalと404 HTMLを生成している。

不足:

- `src/frontend/portal/`
- `src/frontend/errors/`
- Portal / Error PageのSource化
- Build ScriptからUI文字列生成を外す作業

次にやること:

1. 設計どおりSource分離するか、MVP実装としてBuild Script生成を許容するか判断する。
2. Source分離する場合、まずPortalを `src/frontend/portal/` へ移す。
3. 次に404 / 500 / 503 / common Error Pageを `src/frontend/errors/` へ分離する。

推奨:

- 次工程でPortal Source分離から着手する。

### B-2. watch系Commandの未整備

`docs/design/10_repository_build_runtime_design.md` では `npm run watch`、`watch:<domain>`、Development Gateway構成が定義されている。

現実装:

- root `package.json` は `dev:<domain>` を提供している。
- `watch` / `watch:<domain>` は未整備。
- 単一Development Gateway `:5173` は未実装。

不足:

- `npm run watch`
- `npm run watch:portal`
- `npm run watch:dashboard`
- `npm run watch:workouts`
- `npm run watch:exercises`
- `npm run watch:analytics`
- `npm run watch:settings`
- 単一Gatewayからのroute proxy

次にやること:

1. 現行 `dev:<domain>` を残すか、設計どおり `watch:<domain>` へ寄せるか決める。
2. Development Gatewayの必要範囲を確定する。
3. `tools/dev-runtime/` にGateway Scriptを追加する。

推奨:

- Portal Source分離後に、Development Gatewayを実装する。

### B-3. Node Development RuntimeのAF互換API不足

設計上、Node Development RuntimeはAF互換Response Envelopeを返す薄いAdapterとする。

現実装:

- Preview / dev用の旧 `/api/workout-data` が残っている。
- Windows AF Runtime API優先参照は実装済み。
- Settings系APIのdev runtimeは未実装。

不足:

- `GET /api/v1/common/status`
- `GET /api/v1/common/runtime/workouts`
- version省略Aliasの整理
- Settings開発時の必要最小API

次にやること:

1. Frontend開発でAFなしに必要なAPI範囲を確定する。
2. 旧endpointを互換用途として残すか、AF互換APIへ集約するか判断する。
3. Node Development RuntimeのResponse Envelopeを本番AFへ寄せる。

推奨:

- Dashboard / Workouts / Exercises / AnalyticsのAF API移行確認後に実施する。

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
3. `docs/design/10_repository_build_runtime_design.md` と現実装の差異として、Portal / Error Page Source分離方針を判断。
4. Portal Source分離に着手。
5. Development Gateway / watch commandの整備方針を判断。
6. Node Development RuntimeのAF互換API整理へ進む。

## 現時点で人間判断が必要な事項

1. Portal / Error Pageを設計どおりSource Application化するか。
2. 現行 `dev:<domain>` commandを残したまま `watch:<domain>` を追加するか、command体系を整理するか。
3. 旧 `/api/workout-data` をいつまで互換維持するか。
4. Easter Eggを次工程で実装対象に含めるか。
5. Android AFをWindows安定化後すぐ開始するか、別Phaseへ送るか。
