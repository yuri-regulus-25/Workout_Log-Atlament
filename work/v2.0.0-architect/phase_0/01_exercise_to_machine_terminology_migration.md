# v2.0.0 Phase 0-A — Exercise → Machine Terminology Migration

## 日本語

### 目的
v2.0.0 の機能追加に先立ち、Atlament のドメイン用語を `Exercise` から `Machine` へ統一する。

本変更は新しい物理 Machine Entity の追加ではない。現在 `Exercise` として表現されている既存ドメイン概念そのものを `Machine` へ名称変更する。

### 対象
Repository 全体を対象とし、少なくとも以下を確認・変更する。

- Master Data: `exercises.json` → `machines.json`
- Workout Data: `exercise_id` → `machine_id`
- Master resource / schema / validation
- Runtime model / types / core
- localhost API の route / request / response / contract
- Windows AF
- Android AF
- Frontend 全 Application / Shared module
- Tests / fixtures / mock data
- Build / validation scripts
- `docs/design` および関連する現行仕様書

既存 Machine ID の値、Workout の意味、履歴そのものは変更しない。名称・Schema・Contract を一貫して Machine terminology へ移行する。

### 実施方針
Repository-wide grep/search により `Exercise` / `exercise` / `EXERCISE` および関連 identifier を網羅探索する。

Atlament のドメイン上で既存 Exercise 概念を意味するものは原則として Machine へ変更する。一般英語としての exercise、外部仕様、変更不能な third-party identifier 等は意味を確認し、誤置換しない。

Compatibility layer は原則として設けず、Repository 内部の Data / API / Runtime / Frontend / Native Application を同一タイミングで移行する。

### Validation
- Repository-wide search で旧 Domain terminology の残存を確認する。
- Master / Workout JSON 全件の parse / schema / referential integrity を確認する。
- `machine_id` が Machine Master を正しく参照することを確認する。
- Windows / Android / Development Runtime の API contract を確認する。
- 全 Frontend build / test / MPA build / smoke validation を実施する。
- Native 側で実行可能な test / build を実施する。
- 設計書と実装・Data SoT が一致していることを確認する。

### 完了条件
Repository の正式 Domain Term が `Machine` に統一され、旧 `Exercise` terminology が Atlament Domain の意味で残存していないこと。Data、localhost API、Runtime、Frontend、Windows、Android、Test、設計書が同一 terminology / schema / contract を使用していること。

---

## English

### Objective
Before implementing v2.0.0 features, standardize the Atlament domain terminology from `Exercise` to `Machine`.

This change does not introduce a new physical Machine entity. The existing domain concept currently represented as `Exercise` is renamed to `Machine`.

### Scope
Perform a repository-wide migration, including at minimum:

- Master Data: `exercises.json` → `machines.json`
- Workout Data: `exercise_id` → `machine_id`
- Master resources / schemas / validation
- Runtime models / types / core
- localhost API routes / requests / responses / contracts
- Windows AF
- Android AF
- All frontend applications and shared modules
- Tests / fixtures / mock data
- Build / validation scripts
- `docs/design` and related current-specification documents

Do not change existing Machine ID values, workout meaning, or historical workout semantics. Migrate naming, schemas, and contracts consistently to Machine terminology.

### Execution Policy
Use repository-wide grep/search to enumerate `Exercise`, `exercise`, `EXERCISE`, and related identifiers.

Items representing the existing Atlament Exercise domain concept must be renamed to Machine by default. Do not blindly replace general English uses of exercise, external specifications, or immutable third-party identifiers without checking their meaning.

Do not introduce a compatibility layer by default. Migrate Data, API, Runtime, Frontend, and Native Applications together.

### Validation
- Search the entire repository for remaining legacy domain terminology.
- Parse and validate all Master / Workout JSON and verify referential integrity.
- Verify every `machine_id` resolves to the Machine Master.
- Verify API contracts across Windows, Android, and Development Runtime.
- Run all applicable frontend builds/tests, MPA build, and smoke validation.
- Run applicable native tests/builds.
- Verify design documents match implementation and Data SoT.

### Completion Criteria
`Machine` is the canonical repository domain term and no legacy `Exercise` terminology remains where it represents the Atlament domain concept. Data, localhost APIs, Runtime, Frontend, Windows, Android, tests, and design documents use the same terminology, schema, and contract.