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

## Frontend Artifact配置

Windows AFは実行Directory配下の `data/frontend/` をHosting Rootとして使用します。

Debug Buildでは、Repository直下に `dist/` が存在する場合、Build時に以下へ自動コピーされます。

```text
src/application/windows/bin/Debug/net8.0-windows/data/frontend/
```

Production相当では、`npm run build` で生成した `dist/` の中身を `<exe directory>/data/frontend/` へ配置します。

## Runtime Data配置

実行時の主な保存先は `.exe` と同じDirectoryの `data/` 配下です。

```text
data/
├─ configuration/
├─ runtime/
├─ logs/
└─ frontend/
```

CredentialはWindowsのSecure Storage方針に従い、Token値をFrontendやLogへ出力しません。

## 起動確認

Visual Studio Debug起動、またはBuild出力先の `Atlament.exe` を起動します。

起動後はPortalがWebView2に表示され、localhost HTTP Serverから以下のrouteを配信します。

```text
/
/dashboard/
/workouts/
/exercises/
/analytics/
/settings/
```

主要APIは `/api/v1/common/` 配下です。
