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
  各FrontendのBuild ArtifactをRepository直下 `dist/` に集約し、Portalと404を生成します。

- `tools/dev-runtime/preview-mpa.mjs`  
  Build済み `dist/` を静的配信します。

- `tools/validation/check-mpa.mjs`  
  `dist/` の主要routeと404を確認します。

## Repository直下から使うコマンド

```sh
npm run build
npm run preview:mpa
npm run check:mpa
```

ScriptはProduction Sourceを所有しません。Build済みArtifactの組み立てと検証に責務を限定します。
