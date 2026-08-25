# docs

機能要件、設計書、実装指示を管理します。

## design

正式な設計ドキュメントを管理します。実装判断に迷った場合は、まず `docs/design/` の最新内容を確認します。

特に重要な設計書は以下です。

- `07_af_detailed_design.md`  
  Windows AF / AF Core / API Contractの詳細設計です。

- `08_common_js_detailed_design.md`  
  Frontend共通JS / Runtime API接続の詳細設計です。

- `09_frontend_settings_detailed_design.md`  
  Settings Frontendの詳細設計です。

- `10_repository_build_runtime_design.md`  
  Repository構成、Build、Packaging、Runtime配置の詳細設計です。

## instructions

LLMや製造作業向けの指示ドキュメントを管理します。

## 注意点

設計書と実装に矛盾がある場合は、推測で実装を進めず、矛盾点を整理して判断を待ちます。
