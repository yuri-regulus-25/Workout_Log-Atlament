# Application Framework Localhost API Inventory

現行v3.0.0リリース系列のAPI棚卸し結果。

API の意味論そのものは [AF API Contract](./api-contract.md) を正とする。この文書の Phase 記録を最新契約の根拠にはしない。

## Current / Planned Endpoint Inventory

| Endpoint | Native Producer | Main Consumer | State |
|---|---|---|---|
| `GET /api/v1/common/status` | Windows, Android, Node dev runtime | Portal status gate, Settings status panel, AF tests | Keep |
| `GET /api/v1/common/runtime/workouts` | Windows, Android, Node dev runtime | `@workout-lab/workout-data` runtime loader used by dashboard/workouts/machines/analytics | Keep |
| `POST /api/v1/common/sync` | Windows, Android | Settings manual sync | Keep |
| `GET /api/v1/common/configuration` | Windows, Android | Settings configuration form | Keep |
| `POST /api/v1/common/configuration` | Windows, Android | Settings repository/resource/timeout save actions | Keep |
| `GET /api/v1/common/credential/status` | Windows, Android | Settings credential panel | Keep |
| `POST /api/v1/common/credential` | Windows, Android | Settings credential save action | Keep |
| `GET /api/v1/common/recovery/resources` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `GET /api/v1/common/recovery/resources/{resourceKey}` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `GET /api/v1/common/recovery/resources/{resourceKey}/source` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `GET /api/v1/common/recovery/resources/{resourceKey}/draft` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `POST /api/v1/common/recovery/resources/{resourceKey}/draft` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `PUT /api/v1/common/recovery/resources/{resourceKey}/draft` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `DELETE /api/v1/common/recovery/resources/{resourceKey}/draft` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `POST /api/v1/common/recovery/resources/{resourceKey}/validate` | Windows, Android, Node dev runtime | Maintenance Recovery UI | Keep |
| `POST /api/v1/common/recovery/resources/{resourceKey}/commit` | Windows, Android, Node dev runtime | Maintenance Recovery UI | 維持。Windows/Androidは修復可否に従ってコミット可能、Node.js開発用ランタイムは機能可否で制限 |
| `POST /api/v1/common/shutdown` | Windows, Android | Native/application lifecycle control endpoint | Keep |
| `/api/common/*` | Former Windows, Android, Node dev runtime alias | No current frontend client or runtime loader | Remove |
| `GET /api/workout-data` | Node dev/runtime preview tooling only | `@workout-lab/workout-data` fallback and Vite/preview dev tooling | Keep as dev-only legacy data endpoint outside native AF contract |

Recovery endpoint の内訳は [Recovery 契約](./recovery-contract.md) を参照する。

## Producer Scope

Node development runtime は native AF の全機能を模倣する必要はない。Local development に必要な read-only subset を提供できる。

ただし同名 endpoint / DTO を実装する場合は native AF と意味を変えない。

## Current Response Facts

### Common Envelope

```text
success
errors
warnings
data
```

`errors[].code` は logic 用 stable code、`message` は人間向け表示。Runtime warning は request failure と分離する。

### Status

主な facts:

- `versions.*`
- `readiness.*`
- `runtimeData.*`
- `application.*`
- `operations.*`
- `components.*`
- `requiredActions`

v2.1.0 では Broken Resource / Recovery / quarantine を Frontend が独自推論しないための structured facts を追加する。具体形は API Contract を正とする。

### Configuration Update

`remoteChecked` は repository / resources 変更後の remote check 実施有無を表す。

### Sync

`degraded` は従来 remote failure + LKG fallback の表示分岐に使用する。

Resource Health の `degraded`、Application Readiness の `degraded`、operation result の `degraded` は異なる state space である。文書・型・変数では何の degraded か判別できる名称を優先する。

## Removed / Legacy Fields

- top-level `version`: `versions.applicationFramework` と重複するため削除済み。
- configuration update `saved`: envelope `success` と重複するため削除済み。
- sync `source`: consumer 不在のため削除済み。
- sync `updated`: envelope `success` と重複するため削除済み。

Status keeps existing component/readiness fields and adds only `runtimeData` facts required to distinguish current data availability, latest remote retrieval, latest validation, active fallback, and quarantine. Credential lifecycle remains represented by credential status (`configured`, `state`, `limitDate`) plus the credential component state; configured-but-expired or invalid credentials are runtime degradation inputs, not setup absence.

## v3.0.0 Recovery Contract

Recoveryは、Windows、Android、Node.js開発用ランタイム、フロントエンド共通処理、Maintenance UIの間で用途別エンドポイントを揃える。APIはRaw JSON書き込み、任意パスへの書き込み、汎用Git操作、フロントエンドが保持する認証情報、force push、自動マージ、一括修復を公開しない。WindowsとAndroidは修復可能なリソースをコミットできる。Node.js開発用ランタイムと、書き込み境界を安全に提供できない状態では、機能可否とエラーで利用不能を表し、偽の成功を返さない。
