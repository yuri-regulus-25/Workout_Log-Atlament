# Workout Log Atlament

Workout Log Atlament は、ワークアウト記録を複数のFrontendで閲覧し、Windows Application Framework（Windows AF）からGitHub上のデータを同期して利用するRepositoryです。

## Repository構成

```text
.
├─ data/                         # GitHub上のSoTデータ例
├─ docs/                         # 設計書・実装指示
├─ src/
│  ├─ application/windows/        # Windows AF
│  ├─ frontend/                   # 画面別Frontend
│  └─ shared/                     # 共通Package
├─ tools/                         # Build / Preview / Validation / Dev Runtime Script
├─ work/                          # 作業メモ・ロードマップ
├─ dist/                          # npm run buildで生成されるFrontend Artifact
├─ dist-windows/                  # npm run build:windowsで生成されるWindows配布物
├─ package.json
└─ package-lock.json
```

`dist/` と `dist-windows/` は生成物です。Git管理対象ではなく、必要な時にコマンドで作成します。

## 前提環境

- Node.js / npm
- .NET SDK 8.0 以上
- Windows 10/11
- WebView2 Runtime
- Visual Studio または `dotnet` CLI

Windows AFは .NET 8.0 Windows Forms、ASP.NET Core / Kestrel localhost HTTP Server、WebView2で構成されています。

## 初回準備

Repository直下で依存関係を取得します。

```sh
npm ci
```

Windows AFのNuGet依存関係は、`dotnet build`、Visual Studio Build、または `npm run build:windows` 実行時に復元されます。

## Frontend Build

Production Frontend Artifactを作成します。

```sh
npm run build
```

生成先はRepository直下の `dist/` です。

```text
dist/
├─ dashboard/
├─ workouts/
├─ exercises/
├─ analytics/
├─ settings/
├─ frontend-common/
├─ index.html
├─ style.css
├─ main.js
├─ common.html
├─ 404.html
├─ 500.html
├─ 503.html
└─ error.css
```

## Windows単体配布Build

Windows x64向けの自己完結・単一exe配布物を作成します。

```sh
npm run build:windows
```

このコマンドは内部で `npm run build` を実行し、生成された `dist/` をWindows AF exeへ埋め込みます。出力先は以下です。

```text
dist-windows/
└─ Atlament-v1.0.0-win-x64/
   └─ Atlament.exe
```

配布時は `Atlament.exe` を実行します。Frontend Artifactはexeに埋め込まれるため、配布物に `data/frontend/` を同梱する必要はありません。

## Frontend Preview

Build済みの `dist/` を静的配信して確認します。

```sh
npm run preview:mpa
```

PreviewはBuildを実行しません。事前に `npm run build` を実行してください。

## 開発用Gateway

複数Frontendを開発用固定Portで起動し、Gatewayから確認します。

```sh
npm run watch
```

Gatewayは `http://127.0.0.1:5173/` で起動します。Production Build、Windows AF、`preview:mpa` には影響しません。

## Windows AF Build / Test

Solution Buildを実行します。

```sh
dotnet build src/application/windows/Atlament.sln
```

Testを実行します。

```sh
dotnet test src/application/windows/Atlament.sln
```

Visual Studioで確認する場合は、`src/application/windows/Atlament.sln` を開き、`Atlament` ProjectをDebug起動します。

## Windows AF実行時データ

Windows AFは実行Directory配下の `data/` に、設定・Credential・Runtime Data・Logを保存します。

```text
data/
├─ configuration/
├─ runtime/
└─ logs/
```

Debug Buildでは、Repository直下に `dist/` が存在する場合、従来どおりBuild出力先の `data/frontend/` へFrontend Artifactを自動コピーします。単体配布Buildでは `data/frontend/` を使用しません。

## Windows AF起動後の利用手順

1. `Atlament.exe` を起動します。
2. 初回起動時に必要な設定が不足している場合、初期設定通知が表示されます。
3. Portalまたは `/settings/` からApplication Settingsを開きます。
4. Repository、Resources、Timeout、Credentialを設定します。
5. GitHub Tokenを登録します。Token値は再表示されません。
6. Manual Syncを実行します。
7. Dashboard、Workouts、Exercises、Analyticsで同期済みRuntime Dataを確認します。

## 主要確認コマンド

```sh
npm test
npm run build
npm run check:mpa
npm run build:windows
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
```

## 既知Warning

- `dotnet build/test/publish` で `WindowsBase` の参照競合警告が出る場合があります。現時点ではBuild/Testを阻害しない既知Warningです。
- Dashboard / AnalyticsなどでViteのchunk size warningが出る場合があります。
- Exercises Angularでbundle budget warningが出る場合があります。

## 設計書

実装判断は `docs/design/` を正とします。特にWindows AFは `docs/design/07_af_detailed_design.md`、Frontend Settingsは `docs/design/09_frontend_settings_detailed_design.md`、Repository / Build / Runtimeは `docs/design/10_repository_build_runtime_design.md` を確認してください。
