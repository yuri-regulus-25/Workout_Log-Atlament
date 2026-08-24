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
npm run dev:settings
```

## Build

```sh
npm run build
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
