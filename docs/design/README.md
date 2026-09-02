# Atlament 設計書

このディレクトリは Workout Log Atlament の現行仕様書を中心に、設計判断の基準となる共通設計原則を管理する。

各文書は、現行 Source Code、Data file、Build 定義、Test、Native project 定義に存在する挙動を記述する。過去の Planning 資料ではなく、将来の Application 追加を記述するものではない。

文書とソースコードが異なる場合、現行挙動の事実確認ではソースコードを最優先の根拠とする。一方、[共通設計原則](01_basic-design/design-principles.md) は将来実装を含む設計判断の上位基準として扱う。現行実装が共通設計原則と異なる場合は、原則を実装へ合わせて無条件に書き換えず、設計差異として扱う。

設計文書で使用するAtlament固有用語は [設計用語集](glossary.md) を参照する。利用者向けの画面・機能説明は [`docs/user-guide/application-guide.md`](../user-guide/application-guide.md) に分離する。

## 文書の役割

- `docs/design/`: 現行仕様と、横断的な共通設計原則・共通UX契約。
- `docs/user-guide/`: 利用者向けの画面・機能説明。
- `work/`: Release Planning、調査、UT証跡、レビュー原資料等。
- 実装済みのPlanning内容はRelease反映時に関連する `docs/design/` へ昇格する。
- UT / investigation / review原資料は、その時点の事実・判断経緯を保持する証跡として原則上書きしない。

## 文書表現

本文は日本語中心で記述する。型名、API、route、path、error code、Framework名等、実装上の識別子・正式名称は英語を保持する。

一般説明文で不要に日本語と英語を混在させない。編集基準は `work/documentation-cleanup/README.md` を参照する。

## Layer Model

`01_basic-design/` はsystem-level designと共通設計原則を含む。Application全体、主要な境界、画面、データ概要、Technology Stack、横断的な設計判断基準を説明する。

`02_detailed-design/` はlayerおよびcomponentの仕様を含む。Repository、Data、Application Framework、Frontend Framework、external I/Oごとに整理する。

Frontend Frameworkの実装方式をまたぐUXの意味・状態・操作規則は [共通UX契約](02_detailed-design/frontend-framework/common-ux-contract.md) を参照する。

## Directory Map

```text
docs/design/
├─ README.md
├─ glossary.md
├─ 01_basic-design/
│  ├─ design-principles.md
│  ├─ system-overview.md
│  ├─ architecture.md
│  ├─ screen-structure.md
│  ├─ data-overview.md
│  └─ technology-stack.md
└─ 02_detailed-design/
   ├─ repository/
   │  ├─ structure.md
   │  └─ build-runtime.md
   ├─ data/
   │  ├─ master-data/
   │  │  └─ current-schema.md
   │  └─ workout-data/
   │     └─ current-schema.md
   ├─ application-framework/
   │  ├─ api-contract.md
   │  ├─ api-inventory.md
   │  ├─ recovery-contract.md
   │  ├─ runtime-contract-matrix.md
   │  ├─ windows/
   │  │  └─ current-spec.md
   │  └─ android/
   │     └─ current-spec.md
   ├─ frontend-framework/
   │  ├─ common-ux-contract.md
   │  ├─ common-js.md
   │  ├─ common-css.md
   │  ├─ portal.md
   │  ├─ dashboard.md
   │  ├─ workout-domain.md
   │  ├─ performance-detail.md
   │  ├─ analytics.md
   │  ├─ application-settings.md
   │  └─ error-pages.md
   └─ io/
      ├─ github.md
      ├─ filesystem.md
      └─ http-api.md
```

## Index

共通資料:

- [設計用語集](glossary.md)
- [利用者向け画面・機能ガイド](../user-guide/application-guide.md)

基本設計:

- [共通設計原則](01_basic-design/design-principles.md)
- [System Overview](01_basic-design/system-overview.md)
- [Architecture](01_basic-design/architecture.md)
- [Screen Structure](01_basic-design/screen-structure.md)
- [Data Overview](01_basic-design/data-overview.md)
- [Technology Stack](01_basic-design/technology-stack.md)

詳細設計:

- [Repository Structure](02_detailed-design/repository/structure.md)
- [Build and Runtime](02_detailed-design/repository/build-runtime.md)
- [Master Data](02_detailed-design/data/master-data/current-schema.md)
- [Workout Data](02_detailed-design/data/workout-data/current-schema.md)
- [AF API Contract](02_detailed-design/application-framework/api-contract.md)
- [AF API Inventory](02_detailed-design/application-framework/api-inventory.md)
- [Recovery Contract](02_detailed-design/application-framework/recovery-contract.md)
- [Runtime Contract Matrix](02_detailed-design/application-framework/runtime-contract-matrix.md)
- [Windows AF](02_detailed-design/application-framework/windows/current-spec.md)
- [Android AF](02_detailed-design/application-framework/android/current-spec.md)
- [共通UX契約](02_detailed-design/frontend-framework/common-ux-contract.md)
- [Common JS](02_detailed-design/frontend-framework/common-js.md)
- [Common CSS](02_detailed-design/frontend-framework/common-css.md)
- [Portal](02_detailed-design/frontend-framework/portal.md)
- [Dashboard](02_detailed-design/frontend-framework/dashboard.md)
- [Workout Domain](02_detailed-design/frontend-framework/workout-domain.md)
- [Performance Detail](02_detailed-design/frontend-framework/performance-detail.md)
- [Analytics](02_detailed-design/frontend-framework/analytics.md)
- [Application Settings](02_detailed-design/frontend-framework/application-settings.md)
- [Error Pages](02_detailed-design/frontend-framework/error-pages.md)
- [GitHub I/O](02_detailed-design/io/github.md)
- [Filesystem I/O](02_detailed-design/io/filesystem.md)
- [HTTP API I/O](02_detailed-design/io/http-api.md)

## Evidence Policy

現行仕様文書で使用する主な根拠:

- `src/` 配下のソースコード
- `src/shared/` 配下のShared package
- `src/application/windows/` および `src/application/android/` 配下のNative application project
- `tools/` 配下のBuild、Validation、Version、Development Runtime script
- `data/` 配下の現行データ例
- `workout-core`、`workout-data`、Windows / Android AF のテスト
- 過去の設計書、Planning、UT / investigation 証跡

ソースから確認できない現行仕様は、推測で補完しない。現行制約、未反映のPlanning、またはruntime/external-system依存の事実として区別する。
