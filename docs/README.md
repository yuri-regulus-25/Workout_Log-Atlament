# docs

機能要件、設計書、実装指示を管理します。

## design

正式な設計ドキュメントを管理します。実装判断に迷った場合は、まず `docs/design/` の最新内容を確認します。

`docs/design/README.md` が現行As-Is仕様書のIndexです。

特に重要な入口は以下です。

- `docs/design/01_basic-design/system-overview.md`
  System全体の現行仕様です。

- `docs/design/02_detailed-design/application-framework/api-contract.md`
  AF HTTP API Contractの詳細設計です。

- `docs/design/02_detailed-design/application-framework/windows/current-spec.md`
  Windows AFの詳細設計です。

- `docs/design/02_detailed-design/application-framework/android/current-spec.md`
  Android AFの詳細設計です。

- `docs/design/02_detailed-design/frontend-framework/`
  Frontend共通基盤と各Applicationの詳細設計です。

- `docs/design/02_detailed-design/data/`
  Master Data / Workout Dataの現行Schemaです。

## instructions

LLMや製造作業向けの指示ドキュメントを管理します。

## 注意点

設計書と実装に矛盾がある場合は、推測で実装を進めず、矛盾点を整理して判断を待ちます。
