# Settings Frontend

SolidJS + TypeScript + ViteでApplication Settings画面を実装しています。

## 担当Route

```text
/settings/
```

## 主な設定項目

- Application Status
- Repository
- Resources
- Timeout
- Credential
- Operations

## 開発起動

Repository直下で実行します。

```sh
pnpm run dev:settings
```

Gateway経由で確認する場合はRepository直下で `pnpm run watch` を実行し、`http://127.0.0.1:5173/settings/` を開きます。Settingsの開発Server固定Portは `127.0.0.1:5179` です。

## Build

```sh
pnpm run build
```

統合Buildにより、最終的なProduction Artifactは `dist/settings/` に配置されます。

## API接続

SettingsはWindows AFの正式API Contractを使用します。

```text
/api/v1/common/status
/api/v1/common/configuration
/api/v1/common/credential/status
/api/v1/common/credential
/api/v1/common/sync
```

Token値はFrontend Storageへ保存せず、AF APIからも再表示しません。

## 共通層

- `@workout-lab/frontend-common`

Navigation、Page Transition、Branding、Character Easter Eggの共通基盤を利用します。設定保存、Credential保存、Sync処理は必ずAF API経由で実行します。
