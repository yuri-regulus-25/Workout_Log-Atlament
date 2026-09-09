# Atlament 設計書

このディレクトリは Workout Log Atlament の現行 As-Is 仕様書である。

各文書は、現行 Source Code、Data file、Build 定義、Test、Native project 定義に存在する挙動を記述する。過去の Planning 資料ではなく、将来の Application 追加を記述するものではない。

文書と Source Code が異なる場合、Source Code を最優先 Evidence とする。旧 reverse-engineered source snapshot はこの構成へ吸収済みであり、削除済みである。

## Layer Model

`01_basic-design/` は system-level design を含む。実装詳細には踏み込まず、Application 全体、主要 boundary、画面、Data 概要、Technology Stack を説明する。

`02_detailed-design/` は layer および component の仕様を含む。Repository、Data、Application Framework、Frontend Framework、external I/O ごとに整理する。

## Directory Map

```text
docs/design/
├─ README.md
├─ 01_basic-design/
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
   │  ├─ windows/
   │  │  └─ current-spec.md
   │  └─ android/
   │     └─ current-spec.md
   ├─ frontend-framework/
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

基本設計:

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
- [Windows AF](02_detailed-design/application-framework/windows/current-spec.md)
- [Android AF](02_detailed-design/application-framework/android/current-spec.md)
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

これらの文書で使用する主な Evidence:

- `src/` 配下の Source Code
- `src/shared/` 配下の Shared package
- `src/application/windows/` および `src/application/android/` 配下の Native application project
- `tools/` 配下の Build、Validation、Version、Development Runtime script
- `data/` 配下の現行 Data example
- `workout-core`、`workout-data`、Windows AF の Test
- 旧 reverse-engineered v1.1.0 source snapshot を含む過去の設計書

Source から確認できない仕様は、将来 TODO ではなく、現行 limitation または runtime/external-system 依存の事実として記述する。
