# v3.7.0 — About

Planning branch: `release-3.7.0-plan`

## Purpose

Atlament 自身の Version / Build / Technology / License 等を表示する純粋 read-only About Application を追加する。

## Core Contract

- Astro。
- Windows / Android で同一 content / information contract。
- About 自身を Version / Build metadata の Source of Truth にしない。
- Build / package / version の既存 Source of Truth から **共通 Build Metadata contract** を生成し、About はその viewer とする。
- Atlament version / build。
- Applications / Frameworks。
- major Packages / Libraries + versions。
- License / Copyright / Attribution。
- relevant official information links。
- Settings の Version 情報表示責務を About へ移し、同じ metadata を複数画面で所有しない。
- Runtime diagnostics / status / settings mutation は About へ持ち込まない。
- Platform ごとの package metadata 差異は共通 information contract 内で明示し、About 側が Windows / Android source を個別探索しない。

## Information Flow

```text
Version / Package / Build Sources of Truth
        ↓
Common Build Metadata Contract
        ↓
About Application
```

About の表示都合で version file や package metadata を二重管理しない。

## Implementation Rule

Implementation 前に Settings、`src/version.json`、Windows project metadata、Android Gradle metadata、Application Registry、package / license 情報源、Platform hosting を横断調査する。

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues

1. `01_information_contract.md` — Issue #151
2. `02_application_settings_migration.md` — Issue #152
