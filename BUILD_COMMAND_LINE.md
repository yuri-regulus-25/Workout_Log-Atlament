# Build Command Line

Workout Log Atlamentで使用する主要コマンドと、そのコマンドが何をしてくれるかをまとめます。

コマンドは基本的にRepository直下で実行します。

## 初回準備

### npm ci

`package-lock.json` に従ってNode.js依存Packageを取得します。

実行タイミング:

- Repositoryを初めてcloneした直後
- `package-lock.json` が更新された後
- `node_modules/` を作り直したい時

生成・更新されるもの:

- `node_modules/`

注意:

- `package-lock.json` を元に厳密にinstallします。
- BuildやTestの前提コマンドです。

## Frontend Build

### pnpm run build

Frontend全体のProduction Artifactを作成します。

内部で行うこと:

1. `pnpm run build:apps` を実行
2. `pnpm run build:mpa` を実行

生成されるもの:

```text
dist/
├─ index.html
├─ style.css
├─ main.js
├─ common.html
├─ 404.html
├─ 500.html
├─ 503.html
├─ error.css
├─ frontend-common/
├─ dashboard/
├─ workouts/
├─ machines/
├─ analytics/
├─ settings/
└─ maintenance/
```

用途:

- Production Frontend Artifact作成
- Windows AF Debug BuildへFrontend Artifactを渡す前準備
- Windows単体配布Buildの前段処理
- `pnpm run check:mpa` や `pnpm run preview:mpa` の前準備

### pnpm run build:apps

各Frontend Applicationの単体Buildを実行します。

内部でBuildするもの:

- Portal
- Error Pages
- Workouts / Vue
- Dashboard / React
- Machines / Angular
- Analytics / Svelte
- Settings / Solid
- Resource Management / Vue + Vuetify

用途:

- 各FrontendのBuildが個別に成功するか確認する
- `dist/` へ統合する前のApplication Artifactを作る

通常は直接実行せず、`pnpm run build` を使います。

### pnpm run build:mpa

各Frontend ApplicationのBuild ArtifactをRepository直下の `dist/` に集約します。

内部で行うこと:

- Portal Artifactを `dist/` 直下へ配置
- Error Page Artifactを `dist/` 直下へ配置
- Dashboard / Workouts / Machines / Analytics / Settings / Maintenanceを各route配下へ配置
- `frontend-common` の共有Assetを `dist/frontend-common/` へ配置

用途:

- MPA構成の最終Frontend Artifactを作る

注意:

- 事前に各FrontendのBuild Artifactが必要です。
- 通常は直接実行せず、`pnpm run build` を使います。

## Windows配布Build

### pnpm run build:windows

Windows x64向けの自己完結・単一exe配布物を作成します。

内部で行うこと:

1. `pnpm run build` を実行
2. `dotnet publish` をRelease / win-x64 / self-contained / single-fileで実行
3. `dist/` のFrontend Artifactを `Atlament.exe` に埋め込み
4. 配布に不要な `.pdb` / `.xml` を除去
5. `dist-windows/` に配布用Folderを作成

生成されるもの:

```text
dist-windows/
└─ Atlament-v<version>-win-x64/
   └─ Atlament.exe
```

用途:

- 人間が配布確認するWindows版exeを作る
- Repository外へコピーして起動できる単体配布物を作る

注意:

- WebView2 Runtimeは同梱しません。
- 配布版ではFrontend Artifactがexeへ埋め込まれるため、`data/frontend/` は不要です。
- 実行後、設定・Runtime Data・Logはexeと同じDirectory配下の `data/` に生成されます。

## Frontend Preview / Validation

### pnpm run version:check

`src/version.json`、Windows metadata、Android metadata、Frontend version artifact生成設定の整合性をread-onlyで検証します。

用途:

- Version情報の直接編集やMerge conflictによる不整合を検出する
- Build前にVersion Primary SourceとPlatform metadataのずれを検出する

注意:

- ファイルは書き換えません。
- 不整合がある場合はnon-zero exitします。

### pnpm run version:set

AtlamentのVersion情報を更新します。Version値は直接編集せず、このコマンドを使用してください。

例:

```sh
pnpm run version:set -- --target frontend --version 1.1.0
pnpm run version:set -- --target windows --version 1.1.0
pnpm run version:set -- --target android --version 1.1.0 --bump-version-code
pnpm run version:set -- --target android --version 1.1.0 --version-code 24
pnpm run version:set -- --target all --version 1.1.0 --bump-version-code
pnpm run version:set -- --target frontend --version 1.1.0 --dry-run
```

target:

- `frontend`
- `windows`
- `android`
- `all`

Androidを含む更新では、`versionName` とは別にAndroid更新判定用の `versionCode` が必要です。`--bump-version-code` または `--version-code <integer>` のどちらかを指定してください。

dry-runでは実際に書き換えず、現在Version、新Version、更新予定ファイル、更新予定field、warning、整合性check結果を表示します。

### pnpm run preview:mpa

Build済みの `dist/` を静的配信します。

用途:

- Windows AFを起動せずにProduction Frontend Artifactをブラウザ確認する
- `dist/` のrouteやasset参照を軽く確認する

注意:

- Buildは実行しません。
- 事前に `pnpm run build` が必要です。

### pnpm run check:mpa

`dist/` の主要routeと404を検証します。

確認する代表route:

- `/`
- `/dashboard/`
- `/workouts/`
- `/workouts/:date`
- `/machines/:id`
- `/analytics/`
- `/settings/`
- `/maintenance/`
- unknown routeの404

用途:

- MPA Artifactのroute破損検知
- Production Build後の軽量smoke check

### pnpm test

Vitestのテストを実行します。

主な対象:

- workout-core
- workout-data
- real data validation

用途:

- Frontend共通データ処理の回帰確認
- Build前後の基本品質確認

### pnpm run check:data

実データに対するworkout-dataの検証テストを実行します。

用途:

- Repository内 `data/` の形式確認
- Parser / Loaderの回帰確認

### pnpm run check:analytics

Analytics Frontendのcheck scriptを実行します。

用途:

- Analytics固有の型・構成確認

### pnpm run check:all

複数のcheckをまとめて実行します。

内部で行うこと:

1. `pnpm run version:check`
2. `pnpm run check:analytics`
3. `pnpm run check:data`
4. `pnpm run check:mpa`

用途:

- Frontend / Data / MPAの横断確認

## 開発起動

### pnpm run watch

Development Gateway、Development Runtime、Portal、各Frontend開発Serverをまとめて起動します。

主なPort:

```text
127.0.0.1:5173  Development Gateway
127.0.0.1:5174  Portal dev server
127.0.0.1:5175  Dashboard / React
127.0.0.1:5176  Workouts / Vue
127.0.0.1:5177  Machines / Angular
127.0.0.1:5178  Analytics / Svelte
127.0.0.1:5179  Settings / Solid
127.0.0.1:5180  Development Runtime API
127.0.0.1:5181  Resource Management / Vue + Vuetify
```

用途:

- `http://127.0.0.1:5173/` から開発中の各Frontendをまとめて確認する
- Gateway越しにHTTP / WebSocket / HMRを確認する

注意:

- Port競合時は自動変更せず失敗します。
- Windows AF Production Hostingには影響しません。

### pnpm run watch:portal

Portal開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5174/
```

用途:

- Portal Sourceだけを確認する

### pnpm run watch:dashboard

Dashboard Reactの開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5175/dashboard/
```

用途:

- Gateway連携前提のDashboard開発確認

### pnpm run watch:workouts

Workouts Vueの開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5176/workouts/
```

用途:

- Gateway連携前提のWorkouts開発確認

### pnpm run watch:machines

Machines Angularの開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5177/machines/
```

用途:

- Gateway連携前提のMachines開発確認

注意:

- Angularは `--serve-path /machines/` を指定して起動します。

### pnpm run watch:analytics

Analytics Svelteの開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5178/analytics/
```

用途:

- Gateway連携前提のAnalytics開発確認

### pnpm run watch:settings

Settings Solidの開発Serverを固定Portで起動します。

起動先:

```text
http://127.0.0.1:5179/settings/
```

用途:

- Gateway連携前提のSettings開発確認

### pnpm run watch:maintenance

Resource ManagementのVue開発サーバーを固定ポートで起動します。

起動先:

```text
http://127.0.0.1:5181/maintenance/
```

用途:

- ゲートウェイ連携を前提としたResource Managementの開発確認

## 単体Frontend開発起動

### pnpm run dev:dashboard

Dashboard Reactを開発起動します。

用途:

- Dashboard単体の開発確認
- 必要に応じて既存Workout Data APIと併用

### pnpm run dev:workouts

Workouts Vueを開発起動します。

用途:

- Workouts単体の開発確認
- 必要に応じて既存Workout Data APIと併用

### pnpm run dev:machines

Machines Angularを開発起動します。

用途:

- Machines単体の開発確認
- Angular CLIの開発Serverで確認

### pnpm run dev:analytics

Analytics Svelteを開発起動します。

用途:

- Analytics単体の開発確認
- 必要に応じて既存Workout Data APIと併用

### pnpm run dev:settings

Settings Solidを開発起動します。

用途:

- Settings単体の開発確認

### pnpm run dev:maintenance

Resource ManagementのVueアプリを開発用ランタイムとともに起動します。

用途:

- マスターデータ保守、未解決参照、Recovery画面の開発確認

### pnpm run dev:runtime

Development Runtime APIを起動します。

起動先:

```text
http://127.0.0.1:5180/
```

提供する代表API:

- `/api/v1/common/status`
- `/api/v1/common/runtime/workouts`
- 旧互換 `/api/workout-data`

用途:

- Windows AFを起動せずにAF互換EnvelopeのRuntime APIを確認する
- Gateway経由のFrontend開発でRuntime Dataを返す

## Production確認用Frontend Server

### pnpm run prod:dashboard

DashboardのProduction相当previewを起動します。

用途:

- Dashboard単体ArtifactのProduction寄り確認

### pnpm run prod:workouts

WorkoutsのProduction相当previewを起動します。

用途:

- Workouts単体ArtifactのProduction寄り確認

### pnpm run prod:machines

MachinesのProduction相当previewを起動します。

用途:

- Machines単体ArtifactのProduction寄り確認

### pnpm run prod:analytics

AnalyticsのProduction相当previewを起動します。

用途:

- Analytics単体ArtifactのProduction寄り確認

### pnpm run prod:settings

SettingsのProduction相当previewを起動します。

用途:

- Settings単体ArtifactのProduction寄り確認

### pnpm run prod:maintenance

Resource Managementの本番相当プレビューを起動します。

用途:

- Resource Management単体成果物の本番相当確認

## Android ビルド / テスト

### pnpm run build:android

フロントエンド成果物をAndroidのアセットへ同期し、デバッグAPKを生成します。デバッグ版では `versionName` に `-debug` の接尾辞が付きます。

### pnpm run build:android:release

リポジトリ既定の署名設定を使用してリリースAPKを生成します。署名情報は環境変数または未追跡の `src/application/android/local.properties` から取得し、リポジトリへ記録しません。

生成先:

```text
src/application/android/app/build/outputs/apk/release/app-release.apk
```

### Android 単体テスト

```powershell
cd src\application\android
.\gradlew.bat :app:testDebugUnitTest
```

## リリース運用

アプリケーションバージョンは `src/version.json` を正式な参照元とし、`pnpm run version:set` と `pnpm run version:check` で各プラットフォームの定義との整合を保ちます。リリース候補は専用のリリースブランチで検証し、合格後に `master` へ明示的なマージコミットで統合します。リリースタグは検証済みのmasterマージコミットへ付与し、同じソースからWindows / Androidの正式成果物を生成します。

テストブランチの試験データや検証記録は本番ソースと区別します。リリースへ必要な差分がないことを確認してから整理し、試験データをリリースブランチへ取り込みません。マージ競合、既存タグ、署名不整合、端末データ削除が必要な状態は推測で処理せず停止して確認します。

## Windows AF CLI

### dotnet build src/application/windows/Atlament.sln

Windows AF SolutionをDebug構成でBuildします。

内部で行うこと:

- NuGet依存関係の復元
- Windows Forms / AF Core / Host / Tests ProjectのBuild
- Repository直下に `dist/` がある場合、Debug出力先へFrontend Artifactをコピー

用途:

- Visual Studio Debug起動前の確認
- Windows AFの通常Build確認

### dotnet build src/application/windows/Atlament.sln -c Release

Windows AF SolutionをRelease構成でBuildします。

用途:

- Release構成の通常Build確認

注意:

- これは単体配布Buildではありません。
- 単体exe配布物を作る場合は `pnpm run build:windows` を使用します。

### dotnet test src/application/windows/Atlament.sln

Windows AF Unit Testを実行します。

用途:

- AF Core / Configuration / Runtime Data / Hostingなどの回帰確認

### dotnet publish src/application/windows/Atlament.csproj ...

Windows AF Projectをpublishします。

用途:

- 手動でpublish条件を検証する場合

通常は直接実行せず、`pnpm run build:windows` を使用します。

## よく使う組み合わせ

### Frontend変更後

```sh
pnpm test
pnpm run build
pnpm run check:mpa
```

### Windows AF変更後

```sh
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
```

### Windows配布物を作る

```sh
pnpm run build:windows
```

### 最終Validation寄り

```sh
pnpm test
pnpm run build
pnpm run check:mpa
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
pnpm run build:windows
```

## 既知Warning

- `dotnet build/test/publish` で `WindowsBase` の参照競合警告が出る場合があります。
- Dashboard / AnalyticsでViteのchunk size warningが出る場合があります。
- Machines Angularでbundle budget warningが出る場合があります。

いずれも現時点ではBuild/Test失敗扱いではありません。
