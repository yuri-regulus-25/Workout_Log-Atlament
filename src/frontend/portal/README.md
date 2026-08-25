# Portal Frontend

Portal画面のSource Applicationです。

## 役割

- `/` のPortal UIを提供します。
- Dashboard / Workouts / Exercises / Analytics / Settingsへの入口を提供します。
- Startup SyncやRuntime Data不足を、Windows AFのStatus APIから取得して通知します。

## Build

Repository直下で実行します。

```sh
npm run build
```

Portal単体では以下を実行できます。

```sh
node src/frontend/portal/build.mjs
```

Build後、Portal単体のArtifactは `src/frontend/portal/dist/` に生成されます。統合Buildでは、この内容がRepository直下の `dist/` へ配置されます。

## 注意点

- PortalはFrontend Frameworkを使用しません。
- Runtime DataをBuild成果物へ埋め込みません。
- LogoやBranding Assetは、正式Assetが配置されるまで追加しません。
