# Workout Log Atlament

Workout Log Atlament は、ワークアウト記録を複数のFrontendで閲覧し、Windows / Android のApplication FrameworkからGitHub上のデータを同期して利用するRepositoryです。

このREADMEはRepositoryの入口です。詳細なBuild / CLI Referenceは [BUILD_COMMAND_LINE.md](BUILD_COMMAND_LINE.md)、設計詳細は [docs/](docs/) を確認してください。

## Overview

Atlamentは大きく3つの層で構成されています。

- Frontend: Portal、Dashboard、Workouts、Performance Detail、Analytics、Application Settings、Error pagesを表示します。
- Windows Application Framework: Windows Forms + WebView2 + localhost HTTP ServerでFrontendとAPIを提供します。
- Android Application Framework: Kotlin Androidアプリ + WebView + localhost HTTP Serverでpackaged frontend assetsとAPIを提供します。

Runtime DataはGitHub repositoryから同期され、FrontendはAF APIを通じてStatus、Configuration、Credential状態、Workout Dataを参照します。

## Architecture

```text
GitHub data source
        |
        v
Windows AF / Android AF
        |
        +-- localhost HTTP API
        +-- packaged or embedded Frontend assets
        |
        v
Frontend MPA
```

Frontendは画面ごとに複数Frameworkで実装されています。Navigation、Branding、Theme、Easter Egg、Design Tokens、共有style、Workout Data処理は `src/shared/` に集約されています。

Version情報は `src/version.json` をPrimary Sourceとし、Version CLIでWindows / Android metadataと同期します。Version値を人間が個別に直接編集する運用は避けてください。

## Directory Structure

```text
.
├─ data/                         # GitHub上のSoTデータ例
├─ docs/                         # 設計書・実装指示
├─ src/
│  ├─ application/
│  │  ├─ windows/                # Windows AF
│  │  └─ android/                # Android AF
│  ├─ frontend/                  # 画面別Frontend
│  └─ shared/                    # 共通Package
├─ tools/                        # Build / Preview / Validation / Version / Dev Runtime Script
├─ work/                         # 作業メモ。通常commit対象外
├─ dist/                         # npm run buildで生成されるFrontend Artifact
├─ dist-windows/                 # npm run build:windowsで生成されるWindows配布物
├─ src/version.json              # Version Primary Source
├─ package.json
└─ package-lock.json
```

`dist/`、`dist-windows/`、Android build outputは生成物です。必要な時にコマンドで作成します。

## Prerequisites

- Node.js / npm
- .NET SDK 8.0 以上
- Windows 10/11
- WebView2 Runtime
- Visual Studio または `dotnet` CLI
- Android Studio / Android SDK / Java 17 runtime
- Android実機またはemulatorを使う場合は `adb`

初回準備:

```sh
npm ci
```

`package-lock.json` に従ってNode.js依存Packageを取得します。Windows AFのNuGet依存関係は `dotnet build`、Visual Studio Build、または `npm run build:windows` 実行時に復元されます。

## Frontend

役割:

FrontendはPortalと各機能画面をMPAとして提供し、Windows / Android AFが配信するAPIを利用します。

Source配置:

```text
src/frontend/
├─ portal/
├─ dashboard-react/
├─ workouts-vue/
├─ exercises-angular/
├─ analytics-svelte/
├─ settings-solid/
└─ errors/
```

主な構成:

- Portal: plain JavaScript
- Dashboard: React
- Workouts: Vue
- Performance Detail: Angular
- Analytics: Svelte
- Settings: Solid
- Error pages: static HTML
- Shared resources: `src/shared/frontend-common/`、`src/shared/design-tokens/`、`src/shared/shared-styles/`

Build方法:

```sh
npm run build
```

Frontend全体のProduction Artifactを `dist/` に生成します。内部では各Frontend Applicationをbuildし、`tools/build/build-mpa.mjs` でMPA配信用に集約します。

実行 / 確認方法:

```sh
npm run preview:mpa
```

Build済みの `dist/` を静的配信します。Buildは実行しないため、事前に `npm run build` が必要です。

Version情報の扱い:

Frontend versionは `src/version.json` の `frontend` をPrimary Sourceとします。Status表示やFrontend artifact生成との整合性は `npm run version:check` で確認します。

関連コマンド:

```sh
npm test
npm run build
npm run check:mpa
npm run check:all
```

## Windows

役割:

Windows AFはWindows Forms shell、WebView2、ASP.NET Core / Kestrel localhost HTTP Server、Configuration / Credential / Runtime Data / GitHub Sync、Frontend Artifact Hostingを担当します。

Source配置:

```text
src/application/windows/
├─ Atlament.sln
├─ Atlament.csproj
├─ Core/
└─ Atlament.Tests/
```

Build方法:

```sh
dotnet build src/application/windows/Atlament.sln
```

Windows AF SolutionをDebug構成でBuildします。Repository直下に `dist/` がある場合、Debug出力先の `data/frontend/` へFrontend Artifactをコピーします。

配布Build:

```sh
npm run build:windows
```

Windows x64向けの自己完結・単一exe配布物を作成します。内部で `npm run build` と `dotnet publish` を実行し、Frontend Artifactを `Atlament.exe` へ埋め込みます。

生成先:

```text
dist-windows/
└─ Atlament-v<version>-win-x64/
   └─ Atlament.exe
```

実行 / 配布方法:

`dist-windows/Atlament-v<version>-win-x64/Atlament.exe` を起動します。WebView2 Runtimeは同梱しません。起動後、設定・Runtime Data・Logはexeと同じDirectory配下の `data/` に生成されます。

Version情報の扱い:

Windows versionは `src/version.json` の `windows` と `src/application/windows/Atlament.csproj` の `<Version>`、`<FileVersion>`、`<InformationalVersion>` を同期します。直接編集せずVersion CLIを使用してください。

関連コマンド:

```sh
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
npm run build:windows
```

Platform固有の注意事項:

- Installerは現時点では用意していません。
- WebView2 User Dataと `data/` は実行Directory配下に作成されます。
- `dotnet build/test/publish` で `WindowsBase` の参照競合warningが出る場合があります。

## Android

役割:

Android AFはKotlin Androidアプリ、WebView shell、アプリ内localhost HTTP Server、packaged frontend assets配信、Configuration / Credential / Runtime Data / GitHub Syncを担当します。

Source配置:

```text
src/application/android/
├─ app/
│  ├─ build.gradle.kts
│  └─ src/main/
├─ build.gradle.kts
└─ gradle.properties
```

主な構成:

- `applicationId`: `jp.yuri_regulus_25.atlament`
- `minSdk`: 29
- `targetSdk`: 35
- Primary localhost port: `127.0.0.1:14108`
- Secondary localhost port: `127.0.0.1:45194`
- Frontend assets: `src/application/android/app/src/main/assets/frontend`

Debug Build:

```sh
npm run build:android
```

Frontend assetsを再生成してAndroid projectへ同期し、Debug APKを生成します。内部で `npm run build`、`tools/build/copy-android-frontend.mjs`、`:app:assembleDebug` を実行します。

Release Build:

```sh
npm run build:android:release
```

Frontend assetsを再生成してAndroid projectへ同期し、署名済みRelease APKを生成します。内部で `:app:assembleRelease` を実行します。

Release APK生成先:

```text
src/application/android/app/build/outputs/apk/release/app-release.apk
```

Release署名情報は環境変数または未追跡の `src/application/android/local.properties` から読み込みます。

```sh
ATLAMENT_RELEASE_STORE_FILE=app/signing/atlament-release.jks
ATLAMENT_RELEASE_STORE_PASSWORD=<store password>
ATLAMENT_RELEASE_KEY_ALIAS=atlament
ATLAMENT_RELEASE_KEY_PASSWORD=<key password>
```

Android Release APKを端末へインストールする例:

```sh
adb install -r src/application/android/app/build/outputs/apk/release/app-release.apk
```

既存アプリとの署名違い等で更新インストールできない場合は、既存アプリを削除してからインストールします。削除すると端末内のAtlamentアプリデータも消えます。

```sh
adb uninstall jp.yuri_regulus_25.atlament
adb install src/application/android/app/build/outputs/apk/release/app-release.apk
```

インストール後の確認:

```sh
adb shell am start -n jp.yuri_regulus_25.atlament/.MainActivity
adb shell pm dump jp.yuri_regulus_25.atlament
```

アプリ起動後、WebViewまたは端末ブラウザからStatus APIを確認します。

```text
http://127.0.0.1:14108/api/v1/common/status
http://127.0.0.1:45194/api/v1/common/status
```

Version情報の扱い:

Androidは `versionName` と `versionCode` を別々に扱います。`versionName` は人間向けのSemantic Version、`versionCode` はAndroidの更新判定に使う増加必須の整数です。`src/version.json` の `android.versionName` / `android.versionCode` と `src/application/android/app/build.gradle.kts` をVersion CLIで同期してください。

関連コマンド:

```sh
npm run build:android
npm run build:android:release
npm run version:set -- --target android --version 1.1.0 --bump-version-code
```

Platform固有の注意事項:

- AAB / Google Play配布は現時点のREADME対象ではありません。
- Release Buildには署名passwordが必要です。
- Android Studioで開く場合はRepository rootではなく `src/application/android` を開きます。

## Development Runtime

開発時はGatewayと各Frontend dev server、AF互換のDevelopment Runtime APIをまとめて起動できます。

```sh
npm run watch
```

`http://127.0.0.1:5173/` から開発中の各Frontendを確認します。主なportは以下です。

```text
127.0.0.1:5173  Development Gateway
127.0.0.1:5174  Portal dev server
127.0.0.1:5175  Dashboard / React
127.0.0.1:5176  Workouts / Vue
127.0.0.1:5177  Exercises / Angular
127.0.0.1:5178  Analytics / Svelte
127.0.0.1:5179  Settings / Solid
127.0.0.1:5180  Development Runtime API
```

Development Runtime API単体:

```sh
npm run dev:runtime
```

AF互換EnvelopeのStatus / Configuration / Credential / Sync / Runtime Data APIを開発用に提供します。

## Version Management

Version更新はVersion CLIを唯一の更新経路として扱います。

### version:check

```sh
npm run version:check
```

`src/version.json`、Windows metadata、Android metadataの整合性をread-onlyで検証します。不整合がある場合はnon-zero exitします。

### version:set

```sh
npm run version:set -- --target frontend --version 1.1.0
npm run version:set -- --target windows --version 1.1.0
npm run version:set -- --target android --version 1.1.0 --bump-version-code
npm run version:set -- --target android --version 1.1.0 --version-code 24
npm run version:set -- --target all --version 1.1.0 --bump-version-code
```

Version情報を更新します。`--target` は `frontend`、`windows`、`android`、`all` のいずれかです。`--version` は `x.y.z` 形式のSemantic Versionを指定します。

Androidを含む更新では `--bump-version-code` または `--version-code <integer>` のどちらか一方が必須です。`--bump-version-code` は現在の `versionCode` を1増やします。`--version-code` は明示した整数へ更新しますが、現在値以下は拒否されます。

### dry-run

```sh
npm run version:set -- --target all --version 1.1.0 --bump-version-code --dry-run
```

実際には書き換えず、現在Version、新Version、更新予定ファイル、更新予定field、warning、現在のcheck結果を表示します。

## Build

### Frontend

```sh
npm run build
```

Frontend全体のProduction Artifactを `dist/` に生成します。

### Windows distribution

```sh
npm run build:windows
```

Windows x64向けの自己完結・単一exe配布物を `dist-windows/Atlament-v<version>-win-x64/` に生成します。

### Android debug

```sh
npm run build:android
```

FrontendをAndroid assetsへ同期し、Debug APKを生成します。

### Android release

```sh
npm run build:android:release
```

FrontendをAndroid assetsへ同期し、署名済みRelease APKを生成します。

## Check / Test

### npm test

```sh
npm test
```

Vitestのテストを実行します。主にworkout-core、workout-data、real data validationを確認します。

### check:mpa

```sh
npm run check:mpa
```

Build済み `dist/` の主要routeと404を検証します。

### check:all

```sh
npm run check:all
```

`version:check`、Analytics check、Data check、MPA smoke checkをまとめて実行します。

### Windows test

```sh
dotnet test src/application/windows/Atlament.sln
```

Windows AFのUnit Testを実行します。

## Troubleshooting

- `npm run preview:mpa` で画面が古い場合: 先に `npm run build` を実行してください。
- Angular buildでbundle budget warningが出る場合: 現時点では既知warningです。Build失敗とは区別してください。
- Dashboard / AnalyticsでVite chunk size warningが出る場合: 現時点では既知warningです。
- Windows実行時に画面が表示されない場合: WebView2 Runtimeが入っているか確認してください。
- Android Release Buildが署名で失敗する場合: `ATLAMENT_RELEASE_STORE_PASSWORD` / `ATLAMENT_RELEASE_KEY_PASSWORD` または `src/application/android/local.properties` を確認してください。
- Android更新インストールが失敗する場合: 署名差異やversionCode重複の可能性があります。必要に応じて `adb uninstall jp.yuri_regulus_25.atlament` 後に再インストールしてください。
- Version不整合が疑われる場合: `npm run version:check` を実行し、直接編集ではなく `npm run version:set` で更新してください。

## Related Documents

- [BUILD_COMMAND_LINE.md](BUILD_COMMAND_LINE.md): Build / CLIの詳細Reference
- [docs/README.md](docs/README.md): docs配下の案内
- [docs/design/07_af_detailed_design.md](docs/design/07_af_detailed_design.md): Windows AF詳細設計
- [docs/design/09_frontend_settings_detailed_design.md](docs/design/09_frontend_settings_detailed_design.md): Frontend Settings詳細設計
- [docs/design/10_repository_build_runtime_design.md](docs/design/10_repository_build_runtime_design.md): Repository / Build / Runtime設計
- [src/frontend/README.md](src/frontend/README.md): Frontend構成
- [src/application/windows/README.md](src/application/windows/README.md): Windows AF
- [src/application/android/README.md](src/application/android/README.md): Android AF
- [tools/README.md](tools/README.md): tools配下の概要
