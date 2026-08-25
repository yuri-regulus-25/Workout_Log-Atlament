# tools

Build、Preview、Validation、Development Gateway、Development Runtimeを支えるScriptを管理します。

## 構成

```text
tools/
├─ build/
├─ dev-runtime/
└─ validation/
```

## 主要Script

- `tools/build/build-mpa.mjs`  
  各FrontendのBuild ArtifactをRepository直下 `dist/` に集約します。PortalとError PageのUI生成は各Source Applicationが担当します。

- `tools/build/build-windows.mjs`  
  `npm run build` と `dotnet publish` を実行し、Windows x64向けの自己完結・単一exe配布物を `dist-windows/` に生成します。Frontend Artifactはexeへ埋め込みます。

- `tools/dev-runtime/preview-mpa.mjs`  
  Build済み `dist/` を静的配信します。

- `tools/dev-runtime/development-gateway.mjs`  
  Development Gatewayとして `127.0.0.1:5173` で起動し、開発用Frontend ServerへHTTP / WebSocketをproxyします。

- `tools/dev-runtime/development-runtime.mjs`  
  Development Runtimeとして `127.0.0.1:5180` で起動し、AF互換EnvelopeのRuntime API骨格を提供します。

- `tools/dev-runtime/watch.mjs`  
  Portal、各Frontend開発Server、Development Runtime、Development Gatewayを固定Portで起動します。

- `tools/dev-runtime/portal-dev-server.mjs`  
  Portal Sourceを `127.0.0.1:5174` で開発確認用に配信します。

- `tools/validation/check-mpa.mjs`  
  `dist/` の主要routeと404を確認します。

## Repository直下から使うコマンド

```sh
npm run build
npm run build:windows
npm run watch
npm run watch:portal
npm run preview:mpa
npm run check:mpa
```

ScriptはProduction Sourceを所有しません。Build済みArtifactの組み立て、開発用proxy、検証、配布物生成に責務を限定します。
