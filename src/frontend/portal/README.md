# Portal Frontend

Portal画面のSource Applicationです。

## 役割

- `/` のPortal UIを提供します。
- Dashboard / Workouts / Exercises / Analytics / Settingsへの入口を提供します。
- Startup SyncやRuntime Data不足を、Windows AFのStatus APIから取得して通知します。
- Atlament BrandingとPortal向けCharacter Easter Eggを表示します。

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

## 開発確認

Portal開発Serverのみを起動する場合は以下を使用します。

```sh
npm run watch:portal
```

Development Gateway経由で他Frontendと合わせて確認する場合は以下を使用します。

```sh
npm run watch
```

Gatewayは `http://127.0.0.1:5173/`、Portal開発Serverは `127.0.0.1:5174` で起動します。

## 共通基盤

- Navigation情報は `@workout-lab/frontend-common` のapplication metadataを使用します。
- Logo SVGは `src/shared/frontend-common/src/branding/assets/` の正式AssetをBuild時に取り込みます。
- Branding Easter EggはLogo SVG clickでPrimary / Secondaryを切り替え、`localStorage` の `atlament.system.branding.logoVariant` に保存します。
- Character Easter EggはApplication name textの5クリックで表示します。

## 注意点

- PortalはFrontend Frameworkを使用しません。
- Runtime DataをBuild成果物へ埋め込みません。
- work/work配下の一時AssetはRuntimeやBuildから参照しません。
