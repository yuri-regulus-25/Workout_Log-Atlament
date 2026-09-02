# Application Framework API Contract

Windows と Android は localhost 上で同じ API shape と意味論を公開する。

```text
/api/v1/common
```

Shared frontend client、Windows AF、Android AF、Node development runtime の対応範囲は異なり得るが、同じ endpoint / DTO を実装する場合に意味を Platform ごとに変えない。

## Response Envelope

```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "data": {}
}
```

Error entry:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message.",
  "recoverable": true
}
```

Logic は stable `code` と structured facts を使用し、`message` を parse しない。

## Public Endpoints

### Core

| Method | Path | Responsibility |
|---|---|---|
| GET | `/status` | Current AF status snapshot。 |
| GET | `/runtime/workouts` | Normalized current Runtime Workout Sessions。 |
| POST | `/sync` | Manual remote sync。 |
| GET | `/configuration` | Current non-secret AF configuration。 |
| POST | `/configuration` | Partial configuration update。 |
| GET | `/credential/status` | Token value を含まない credential status。 |
| POST | `/credential` | Credential token と limit date の update。 |
| GET | `/master-write/boundary` | Master write の固定 allowlist と security state。 |
| GET | `/master-write/unresolved` | Workout Data 上の未解決 Master reference 一覧。 |
| GET | `/master-write/documents/{type}` | Master document の current revision と content。 |
| PUT | `/master-write/documents/{type}` | Expected revision 付き Master document write。 |
| GET | `/recovery/resources` | Current Broken Resource inventory。 |
| GET | `/recovery/resources/{resourceKey}` | Recovery Resource inspection/detail。 |
| GET | `/recovery/resources/{resourceKey}/source` | Read-only raw source view。 |
| GET | `/recovery/resources/{resourceKey}/draft` | Local Recovery Draft snapshot。 |
| POST | `/recovery/resources/{resourceKey}/draft` | Local Recovery Draft create/resume。 |
| PUT | `/recovery/resources/{resourceKey}/draft` | Expected draft revision 付き autosave。 |
| DELETE | `/recovery/resources/{resourceKey}/draft` | Local Recovery Draft discard。 |
| POST | `/recovery/resources/{resourceKey}/validate` | Whole Resource Recovery candidate validation。 |
| POST | `/recovery/resources/{resourceKey}/commit` | 検証済みRecovery内容のコミット。Windows/Androidは修復可能なリソースをコミットでき、書き込み境界が利用不能な場合は `RECOVERY_UNAVAILABLE` を返す。 |
| POST | `/shutdown` | Application shutdown request。 |

### Master Resource Management

| Method | Path | Responsibility |
|---|---|---|
| GET | `/master-write/boundary` | 固定 Master write boundary と security state。 |
| GET | `/master-write/unresolved` | Runtime 上の unresolved Master reference。 |
| GET | `/master-write/documents/{type}` | Local Master snapshot の revision と content。 |
| PUT | `/master-write/documents/{type}` | Expected revision 付き Master document write。 |

### Recovery

Recovery の詳細は [Recovery 契約](./recovery-contract.md) を正とする。

```text
GET    /recovery/resources
GET    /recovery/resources/{resourceKey}
GET    /recovery/resources/{resourceKey}/source
GET    /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/draft
PUT    /recovery/resources/{resourceKey}/draft
DELETE /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/validate
POST   /recovery/resources/{resourceKey}/commit
```

Legacy `/api/common/*` alias は公開しない。Unknown `/api/*` route は Frontend HTML へ fall through せず 404 を返す。

## Status Data

Status は Version、Readiness、Runtime、Application、Operation、Component の facts を返す。Frontend はこれらから Resource Health や write eligibility を独自推論しない。

代表 facts:

- `versions.applicationFramework`
- `versions.frontendFramework`
- `versions.nativePackages.windows.version`
- `versions.nativePackages.android.versionName`
- `versions.nativePackages.android.versionCode`
- `readiness.state`
- `readiness.requiredActions`
- `readiness.unavailableComponents`
- `readiness.degradedComponents`
- `runtimeData.currentAvailable`
- `runtimeData.currentGeneratedAt`
- `runtimeData.latestRemoteRetrieval`
- `runtimeData.latestValidation`
- `runtimeData.fallbackActive`
- `runtimeData.quarantinedWorkoutResourceCount`
- `recovery.brokenResourceCount`
- `recovery.brokenWorkoutResourceCount`
- `recovery.brokenMasterResourceCount`
- `recovery.recoverableResourceCount`
- `recovery.activeDraftCount`
- `application.status`
- `application.degraded`
- `application.acceptingRequests`
- operation state
- component state
- `requiredActions`

v2.1.0 Recovery 反映時は少なくとも次の facts を status またはその structured child object で公開する。

```text
brokenResourceCount
brokenWorkoutResourceCount
brokenMasterResourceCount
recoverableResourceCount
activeDraftCount
quarantinedWorkoutResourceCount
```

具体 DTO 配置は implementation と shared type を一致させる。Message や Runtime Session 数から Frontend が再計算しない。

## Application Readiness

```text
unconfigured
ready
degraded
unavailable
```

- `unconfigured`: Repository configuration または credential が不足し setup 未完了。
- `ready`: 通常利用に必要な状態が揃っている。
- `degraded`: Runtime は利用可能だが、一部 component / Resource に確認・復旧事項がある。
- `unavailable`: setup 済みだが Runtime を安全に利用できない。

代表 required action:

```text
CONFIGURATION_REQUIRED
CREDENTIAL_REQUIRED
RUNTIME_DATA_REQUIRED
```

`RUNTIME_DATA_REQUIRED` は Runtime が本当に利用不能な場合だけ使用する。Broken Workout Resource が隔離されても利用可能な Runtime がある場合、Recovery は案内対象だが `RUNTIME_DATA_REQUIRED` にはしない。

Main Gym 未設定は optional Domain Context 不足であり readiness failure ではない。

詳細な入力状態別 contract は [Runtime Contract Matrix](./runtime-contract-matrix.md) を正とする。

## Configuration Data

### 現行 schema

現行実装には以下が存在する。

```json
{
  "schemaVersion": 1,
  "repository": {
    "owner": "",
    "repository": "",
    "ref": "main",
    "rootPath": ""
  },
  "resources": [
    { "type": "WORKOUT", "path": "workouts/", "resourceKind": "directory", "required": true, "emptyAllowed": false },
    { "type": "MACHINE_MASTER", "path": "master/machines.json", "resourceKind": "file", "required": true, "emptyAllowed": false },
    { "type": "GYM_MASTER", "path": "master/gyms.json", "resourceKind": "file", "required": true, "emptyAllowed": false }
  ],
  "timeouts": {
    "githubRequestTimeoutSec": 10,
    "syncOperationTimeoutSec": 60,
    "generalApiTimeoutSec": 30,
    "shutdownTimeoutSec": 10
  }
}
```

### 修正する契約

`required` と `emptyAllowed` は利用者設定から廃止する。Resource の存在要件・空状態は Resource Type ごとの Domain Contract とする。

目標形:

```json
{
  "schemaVersion": 2,
  "repository": {
    "owner": "",
    "repository": "",
    "ref": "main",
    "rootPath": ""
  },
  "resources": [
    { "type": "WORKOUT", "path": "workouts/", "resourceKind": "directory" },
    { "type": "MACHINE_MASTER", "path": "master/machines.json", "resourceKind": "file" },
    { "type": "GYM_MASTER", "path": "master/gyms.json", "resourceKind": "file" }
  ],
  "timeouts": {
    "githubRequestTimeoutSec": 10,
    "syncOperationTimeoutSec": 60,
    "generalApiTimeoutSec": 30,
    "shutdownTimeoutSec": 10
  }
}
```

`schemaVersion: 2` は移行時の目標例であり、実装時に既存 configuration migration / backward compatibility と合わせて確定する。既存 field を意味だけ変えて使い回さない。

Resource Type semantics:

- `WORKOUT`: Resource 0 件は正常な初期状態。存在する空 file は正常空状態の標準表現ではない。
- `MACHINE_MASTER`: configured file 自体の不在は異常。有効 file 内の record 0 件は許容可能。
- `GYM_MASTER`: configured file 自体の不在は異常。有効 file 内の record 0 件は許容可能。

Valid resource type:

```text
WORKOUT
MACHINE_MASTER
GYM_MASTER
```

現行 Resource Kind:

```text
file
directory
```

## Master Write Contract

Master write endpoint が受け付ける `type`:

```text
MACHINE_MASTER
GYM_MASTER
```

`/master-write/boundary` は repository owner / repository / ref と固定 target を返す。Target path は request の任意値を信頼せず AF 内部で認可する。

現行 target:

- `MACHINE_MASTER`: `master/machines.json`
- `GYM_MASTER`: `master/gyms.json`

Frontend へ Generic Git write、Raw Workout write、credential、任意 commit message を公開しない。

`GET /master-write/documents/{type}` は current Local Master snapshot を返す。Snapshot がない場合は `MASTER_SYNC_REQUIRED`。

Write は Local revision と `expectedRevision`、candidate whole-master validation、Remote revision を確認してから実行する。Commit message は AF 固定。

Whole-master validation:

- duplicate ID を active / deleted 双方を含め reject。
- `main:true` は最大 1 件。
- Main Gym は active / non-deleted record のみ。
- 設定済み Main Gym を意図せず 0 件へ戻す遷移は reject。
- Runtime が参照する Gym / Machine の logical delete は許可し、次回 rebuild で unresolved warning とする。

Unresolved reference を既存 Master record へ resolve する場合は `source_ids` を利用できる。Raw Workout ID は書き換えず、Runtime normalization が canonical Master ID へ解決する。

主な failure code:

```text
MASTER_WRITE_INVALID
MASTER_WRITE_CONFLICT
MASTER_WRITE_FAILED
MASTER_SYNC_REQUIRED
GITHUB_UNAUTHORIZED
GITHUB_FORBIDDEN
GITHUB_RATE_LIMIT
GITHUB_RESOURCE_NOT_FOUND
GITHUB_CONNECTION_FAILED
GITHUB_TIMEOUT
GITHUB_SERVER_ERROR
```

`GITHUB_RATE_LIMIT` を共通 stable code とし、Platform 固有の `GITHUB_RATE_LIMITED` 等を別名として増やさない。

## Recovery Contract Summary

Recovery は Master Write と同様に用途限定 write boundary だが、Broken Workout Resource も対象にできる。

- Frontend は Resource Health を判定しない。
- Frontend は Raw replacement body / arbitrary path / commit message を送らない。
- Same-path replacement は Contents API を使用できる。
- Path relocation は old delete + new create を 1 atomic Git commit で行う。
- Candidate validation が正常に完了し `commitAllowed=false` となる場合は operation success として扱う。
- Git success 後の reflection failure は Git rollback せず「保存済み・反映失敗」として区別する。

## Credential Data

Credential status:

```text
configured
state: available | missing | invalid | expired | unknown
limitDate
```

Token value は API 経由で返さない。

## Operation Concurrency

Conflict する overlapping operation を防止する。Startup sync と manual sync は同時実行しない。

Recovery Draft / Git write は専用 revision による optimistic concurrency を使用し、repository-wide lock は設けない。

## HTTP Status

HTTP status の意味は [HTTP API I/O](../io/http-api.md) を正とする。

特に「Domain validation の結果が commit 不可」と「validation operation 自体の失敗」を区別する。

`remoteChecked` は request が `repository` または `resources` を変更した場合に `true` になる。

Sync data:

```json
{
  "degraded": false
}
```

`degraded` は remote sync 失敗時に local runtime data で継続した場合に `true` になる。

Unresolved Master reference は `resolved` / `missing` / `deleted` / `invalid_excluded` を Runtime entity の `resolution` と top-level `warnings` に保持する。`missing` / `deleted` / `invalid_excluded` だけでは `/sync` の `degraded`、status の `fallbackActive`、readiness degradation を発火しない。Workout は Runtime Data として accept され、sets/reps/weight/count aggregate の対象に残る。

## Recovery Contract

Recovery endpoints are purpose-specific and do not expose Raw JSON write, arbitrary path write, generic Git operations, credential material, automatic merge, force push, or bulk recovery.

現行v3.0.0では、次の公開データ形式をWindows AF、Android AF、Node.js開発用ランタイム、共通フロントエンドクライアント、Maintenance UIで共有する。

- `BrokenResourceSummary`
- `RecoveryResourceDetail`
- `ResourceInspection`
- `RecoveryEligibility`
- `RecoveryCapabilities`
- `RecoveryDraftSnapshot`
- `RecoveryDraft`
- `RecoveryField`
- `RecoverySuggestion`
- `RecoveryValidationResult`
- `RecoveryCommitRequest`
- `RecoveryCommitResult`

WindowsとAndroidは、設定済みのGitHub書き込み境界が利用可能でリソースが修復可能な場合にRecoveryのGitコミットを提供する。Androidは同一パスの置換に加えて、追加と削除を1コミットにまとめるパス移動を実行できる。各ランタイムは実際の状態に対応する機能可否を返し、安全に書き込めない場合は `RECOVERY_UNAVAILABLE` を返す。Node.js開発用ランタイムはローカル開発向けに公開データ形式を再現するが、コミット成功を偽装しない。
