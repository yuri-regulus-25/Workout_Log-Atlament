# Workout Log Atlament

Workout Log Atlament は、ワークアウト記録を複数のFrontendで閲覧し、Windows Application Framework（Windows AF）からGitHub上のデータを同期して利用するためのRepositoryです。

## Repository構成

```text
.
├─ data/                         # GitHub上のSoTデータ例
├─ docs/                         # 設計書・実装指示
├─ src/
│  ├─ application/windows/        # Windows AF
│  ├─ frontend/                   # 画面別Frontend
│  └─ shared/                     # Frontend共通Package
├─ tools/                         # Build / Preview / Validation Script
├─ dist/                          # npm run buildで生成されるFrontend Artifact
├─ package.json
└─ package-lock.json
```

`dist/` は生成物です。Git管理対象として扱わず、必要な時に `npm run build` で作成します。

## 前提環境

- Node.js / npm
- .NET SDK 8.0 以上
- Windows 10/11
- WebView2 Runtime
- Visual Studio または `dotnet` CLI

Windows AFは `.NET 8.0 Windows Forms`、localhost HTTP Server、WebView2で構成されています。

## 初回準備

Repository直下で依存関係を取得します。

```sh
npm ci
```

Windows AFのNuGet依存関係は、`dotnet build` またはVisual Studio Build時に復元されます。

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
├─ index.html
├─ style.css
├─ main.js
└─ 404.html
```

Windows Production Packagingでは、この `dist/` を `<exe directory>/data/frontend/` へ配置します。

## Frontend Preview

Build済みの `dist/` を静的配信して確認します。

```sh
npm run preview:mpa
```

PreviewはBuildを実行しません。事前に `npm run build` を実行してください。

## Windows AF Build

Solution Buildを実行します。

```sh
dotnet build src/application/windows/Atlament.sln
```

Testを実行します。

```sh
dotnet test src/application/windows/Atlament.sln
```

Visual Studioで確認する場合は、`src/application/windows/Atlament.sln` を開き、`Atlament` ProjectをDebug起動します。

## Windows版の資材配置

Debug Buildでは `Atlament.csproj` のBuild Targetにより、Repository直下の `dist/` が存在する場合に、Build出力先へ自動コピーされます。

```text
src/application/windows/bin/Debug/net8.0-windows/
├─ Atlament.exe
└─ data/
   └─ frontend/
      ├─ dashboard/
      ├─ workouts/
      ├─ exercises/
      ├─ analytics/
      ├─ settings/
      ├─ index.html
      ├─ style.css
      ├─ main.js
      └─ 404.html
```

手動でProduction相当のFolderを作る場合は、以下の順で実施します。

```sh
npm run build
dotnet build src/application/windows/Atlament.sln -c Release
```

その後、Release出力先の `data/frontend/` へ `dist/` の中身を配置します。

```powershell
$output = "src/application/windows/bin/Release/net8.0-windows"
New-Item -ItemType Directory -Force "$output/data/frontend"
Copy-Item -Recurse -Force "dist/*" "$output/data/frontend/"
```

Windows AFはProduction RuntimeとしてRepository直下の `dist/` を直接参照しません。実行時は、`.exe` と同じDirectory配下の `data/frontend/` をFrontend Hosting Rootとして使用します。

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
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
```

## 既知Warning

- `dotnet build/test` で `WindowsBase` の参照競合警告が出る場合があります。現時点ではBuild/Testを阻害しない既知Warningです。
- Dashboard / AnalyticsなどでViteのchunk size warningが出る場合があります。現時点ではBuild失敗扱いではありません。

## 設計書

実装判断は `docs/design/` を正とします。特にWindows AFは `docs/design/07_af_detailed_design.md`、Repository / Build / Runtimeは `docs/design/10_repository_build_runtime_design.md` を確認してください。
