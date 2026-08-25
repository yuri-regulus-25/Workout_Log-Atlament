# tools

Build、Preview、Validation、開発Runtimeを支えるScriptを管理します。

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

- `tools/dev-runtime/preview-mpa.mjs`  
  Build済み `dist/` を静的配信します。

- `tools/dev-runtime/development-gateway.mjs`  
  Development Gatewayとして `127.0.0.1:5173` で起動し、開発用Frontend ServerへHTTP / WebSocketをproxyします。

- `tools/dev-runtime/watch.mjs`  
  Portal、各Frontend開発Server、既存Workout Data API、Development Gatewayを固定Portで起動します。

- `tools/dev-runtime/portal-dev-server.mjs`  
  Portal Sourceを `127.0.0.1:5174` で開発確認用に配信します。

- `tools/validation/check-mpa.mjs`  
  `dist/` の主要routeと404を確認します。

## Repository直下から使うコマンド

```sh
npm run build
npm run watch
npm run watch:portal
npm run preview:mpa
npm run check:mpa
```

ScriptはProduction Sourceを所有しません。Build済みArtifactの組み立てと検証に責務を限定します。
