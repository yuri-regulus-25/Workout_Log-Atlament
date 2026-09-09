# Windows AF

Windows Application Framework（Windows AF）のSourceを管理します。

## 役割

- Windows Forms Shell
- WebView2によるFrontend表示
- ASP.NET Core / Kestrel localhost HTTP Server
- AF Core
- Configuration / Credential / Runtime Data / GitHub Sync
- Frontend Artifact Hosting

## Solution

```text
src/application/windows/Atlament.sln
```

Visual Studioで開く場合は、このSolutionを使用します。

## Build / Test

Repository直下で実行します。

```sh
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
```

## Debug / 通常Build時のFrontend Artifact配置

Repository直下に `dist/` が存在する場合、Build時に以下へ自動コピーされます。

```text
src/application/windows/bin/Debug/net8.0-windows/data/frontend/
```

この方式はVisual Studio Debug起動や通常の `dotnet build` 用です。

## Windows単体配布Build

Windows x64向けの自己完結・単一exe配布物はRepository直下から生成します。

```sh
pnpm run build:windows
```

出力先は以下です。

```text
dist-windows/
└─ Atlament-v<version>-win-x64/
   └─ Atlament.exe
```

単体配布Buildでは、Frontend Artifactは `Atlament.exe` に埋め込まれます。配布物に `data/frontend/` は不要です。

## Runtime Data配置

実行時の主な保存先は `.exe` と同じDirectoryの `data/` 配下です。

```text
data/
├─ configuration/   # Repository設定・Credential保存ファイル
├─ runtime/         # 生成済みRuntime Data
└─ logs/            # Log
```

CredentialはWindowsのSecure Storage方針に従い、Token値をFrontendやLogへ出力しません。

## 起動確認

Visual Studio Debug起動、Build出力先の `Atlament.exe`、または `dist-windows/Atlament-v<version>-win-x64/Atlament.exe` を起動します。

起動後はPortalがWebView2に表示され、localhost HTTP Serverから以下のrouteを配信します。

```text
/
/dashboard/
/workouts/
/machines/
/analytics/
/settings/
/maintenance/
```

主要APIは `/api/v1/common/` 配下です。
Master Data書込境界は `/api/v1/common/master-write/boundary` で公開し、AFが設定由来のRepository/Branchと固定Master allowlistだけを返します。Workout Log write、Raw JSON write、Generic Git writeは公開しません。
Master Document persistenceはDocument単位でGitHub Contents APIに保存し、read時のSHAとwrite時のcurrent SHAが一致しない場合はConflictとして拒否します。Commit messageはMaster種別ごとにAF固定文言を使用し、画面入力値として受け取りません。

## 配布時の注意

- WebView2 Runtimeは同梱しません。実行環境にWebView2 Runtimeが必要です。
- Installerは現時点では用意していません。
- exe起動後、WebView2 User Dataと `data/` は実行Directory配下に生成されます。
