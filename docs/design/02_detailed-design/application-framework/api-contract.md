# Application Framework API Contract

Windows と Android は localhost 上で同じ現行 API shape を公開する。

Current prefix:

```text
/api/v1/common
```

Shared frontend client、Windows AF、Android AF、Node development runtime はこの versioned prefix を使用する。

## Response Envelope

現行 AF API はすべて以下を使用する。

```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "data": {}
}
```

`errors` entry は以下を持つ。

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message.",
  "recoverable": true
}
```

`warnings` entry は Runtime Data を accept しながら報告する user-actionable warning である。Master reference warning は以下を持つ。

```json
{
  "code": "MASTER_REFERENCE_MISSING",
  "referenceKind": "machine",
  "resolutionState": "missing",
  "originalId": "legacy-machine-id",
  "resolvedId": null,
  "sessionId": "2026-08-24-01",
  "filePath": "data/workouts/2026/08/2026-08-24.json",
  "line": null,
  "message": "Machine master reference is missing: legacy-machine-id."
}
```

## Endpoints

| Method | Path | Responsibility |
|---|---|---|
| GET | `/status` | Current AF status snapshot。 |
| GET | `/runtime/workouts` | Normalized current runtime workout session。 |
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
| POST | `/recovery/resources/{resourceKey}/commit` | Validated Recovery replacement commit。Android は write capability unavailable の場合 `RECOVERY_UNAVAILABLE` を返す。 |
| POST | `/shutdown` | Application shutdown request。 |

Legacy `/api/common/*` alias は現行 contract では公開しない。Unknown `/api/*` route は frontend HTML へ fall through せず、platform error response を返す。

## Status Data

Status は以下を含む。Version 情報は `versions` object に集約し、top-level `version` は公開しない。

- `versions.applicationFramework`
- `versions.frontendFramework`
- `versions.nativePackages.windows.version`
- `versions.nativePackages.android.versionName`
- `versions.nativePackages.android.versionCode`
- `readiness.state`: `unconfigured`, `ready`, `degraded`, or `unavailable`
- `readiness.requiredActions`
- `readiness.unavailableComponents`
- `readiness.degradedComponents`
- `runtimeData.currentAvailable`
- `runtimeData.currentGeneratedAt`
- `runtimeData.latestRemoteRetrieval`: `unknown`, `succeeded`, `failed`, or `skipped`
- `runtimeData.latestValidation`: `unknown`, `succeeded`, `failed`, or `skipped`
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
- operation state: `startup`, `manualSync`, `configurationUpdate`, `credentialUpdate`, `shutdown`
- component state: `configuration`, `credential`, `github`, `runtimeData`、および per-app hosting state
- `requiredActions`

代表的な required action:

```text
CONFIGURATION_REQUIRED
CREDENTIAL_REQUIRED
RUNTIME_DATA_REQUIRED
```

## Application Readiness

Readiness は frontend が個別に初期設定/利用可能/障害状態を推測しないための共通 domain contract である。Windows、Android、Node development runtime、shared frontend client は同じ state 名を使用する。

| State | Meaning |
|---|---|
| `unconfigured` | Repository/branch configuration または credential が不足しており、初期設定が未完了。 |
| `ready` | 通常利用に必要な configuration、credential、Runtime Data が揃っている。 |
| `degraded` | Runtime Data は利用可能だが、GitHub access、credential validity、fallback operation など一部 component が劣化している。 |
| `unavailable` | 初期設定済みだが Runtime Data がなく、通常 application を安全に利用できない。 |

Readiness は `CONFIGURATION_REQUIRED` と `CREDENTIAL_REQUIRED` を setup failure として扱う。Credential が設定済みで期限切れ/無効になった場合は setup 未完了へ戻さず、credential component の runtime failure として扱う。`RUNTIME_DATA_REQUIRED` は設定済み環境の runtime failure として扱う。Main Gym 未設定は optional domain context 不足であり、readiness failure に含めない。

Shared frontend client は `readiness` と `runtimeData` facts から Application Access Policy を derive する。`unconfigured` は Settings/Setup 等の復旧領域のみを許可し、`ready` は通常Applicationを許可する。`degraded` は影響componentだけを制限して通常Applicationを継続し、`unavailable` は安全に利用できない通常Applicationを制限する。`runtimeData.fallbackActive` が `true` の場合は Remote取得またはvalidationに失敗したが、既存正常Runtime Dataで継続利用中である。

Windows / Android の入力状態別 contract は [Runtime Contract Matrix](./runtime-contract-matrix.md) を正とする。

## Configuration Data

現行 configuration schema:

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

Valid resource type は以下のみである。

```text
WORKOUT
MACHINE_MASTER
GYM_MASTER
```

Valid resource kind は以下である。

```text
file
directory
```

## Master Write Contract

Master write endpoint が受け付ける `type` は以下のみである。

```text
MACHINE_MASTER
GYM_MASTER
```

`/master-write/boundary` は repository owner/repository/ref と固定 target を返す。Target path は configuration の resource path を信頼せず、AF 内部の allowlist で固定する。

- `MACHINE_MASTER`: `master/machines.json`
- `GYM_MASTER`: `master/gyms.json`

Security state は credential/configuration の availability と、公開しない操作を boolean で返す。Workout Log write、Raw JSON write、Generic Git write は `false` であり、対応 endpoint も存在しない。

Native AF の `GET /master-write/documents/{type}` は current Local Master snapshot を返す。Local Master snapshot は Wake Up / Settings Sync によって Runtime Data と一緒に保存される。Resource Management の read/refresh は Remote Master body を独自に取得しない。Local Master snapshot がない場合、native AF は `MASTER_SYNC_REQUIRED` を返す。

`GET /master-write/documents/{type}` response data:

```json
{
  "type": "MACHINE_MASTER",
  "path": "master/machines.json",
  "revision": "github-content-sha",
  "content": "{ \"schema_version\": 1, \"machines\": [] }"
}
```

`PUT /master-write/documents/{type}` request:

```json
{
  "expectedRevision": "github-content-sha",
  "content": "{ \"schema_version\": 1, \"machines\": [] }"
}
```

Successful write response data:

```json
{
  "type": "MACHINE_MASTER",
  "path": "master/machines.json",
  "revision": "new-github-content-sha"
}
```

`GET /master-write/unresolved` response data:

```json
[
  {
    "type": "MACHINE_MASTER",
    "referenceId": "legacy-machine-id",
    "affectedWorkouts": [
      {
        "filePath": "data/workouts/2026/08/2026-08-24.json",
        "line": null,
        "message": "data/workouts/2026/08/2026-08-24.json: Machine master is not found: legacy-machine-id."
      }
    ]
  }
]
```

Unresolved list は current Local Runtime Data の Runtime warning から生成する。Raw Workout JSON は更新しない。Local Runtime Data がない場合、native AF は `MASTER_SYNC_REQUIRED` を返す。

Write は Local Master snapshot revision と `expectedRevision` を比較し、candidate content を whole-master validation した後、GitHub Contents API で Remote revision metadata を確認してから 1 回の PUT を実行する。Local revision mismatch または Remote revision mismatch は sync-required/conflict response であり、client は再取得または Settings Sync 後に表示 revision を更新する必要がある。Commit message は AF 固定で、request から受け取らない。

Write 前には whole-master validation を実行する。Duplicate ID は active/deleted の双方を含めて reject し、`main:true` は最大 1 件、かつ active/non-deleted Gym のみ許可する。設定済み Main Gym を 0 件へ戻す遷移は reject する。Runtime Data が参照している Gym/Machine の logical delete は許可し、参照側は次回 sync/runtime rebuild で unresolved warning として扱う。PUT 成功後は returned revision を Local Master snapshot へ反映し、Local Runtime Data を confirmed Master documents で rebuild する。

Unresolved reference を既存 Master record へ resolve する場合は、Master record の optional `source_ids` に unresolved raw ID を追加する。Runtime normalization は `machine_id` / `gym_id` に加えて `source_ids` を lookup key として扱い、normalized output は canonical Master ID を返す。新規 Master record で resolve する場合は unresolved raw ID を canonical ID として通常 Create flow を通す。

主な failure code:

- `MASTER_WRITE_INVALID`: schema/domain/lifecycle/reference violation、unknown type、invalid request。
- `MASTER_WRITE_CONFLICT`: stale revision または GitHub contents conflict。
- `MASTER_WRITE_FAILED`: GitHub write success response が ambiguous。
- `GITHUB_UNAUTHORIZED`
- `GITHUB_FORBIDDEN`
- `GITHUB_RATE_LIMIT`
- `GITHUB_RESOURCE_NOT_FOUND`
- `GITHUB_CONNECTION_FAILED`
- `GITHUB_TIMEOUT`
- `GITHUB_SERVER_ERROR`

## Credential Data

Credential status は以下を公開する。

- `configured`
- `state`: `available`, `missing`, `invalid`, `expired`, or `unknown`
- `limitDate`

Token value は API 経由で返却されない。

## Operation Concurrency

現行 implementation は conflict する overlapping operation を防止する。Startup sync と manual sync は同時実行できない。

## Operation Results

Configuration update data:

```json
{
  "remoteChecked": true
}
```

`remoteChecked` は request が `repository` または `resources` を変更した場合に `true` になる。

Sync data:

```json
{
  "degraded": false
}
```

`degraded` は remote sync 失敗時に local runtime data で継続した場合に `true` になる。

Unresolved Master reference は `resolved` / `missing` / `deleted` を Runtime entity の `resolution` と top-level `warnings` に保持する。`missing` / `deleted` だけでは `/sync` の `degraded`、status の `fallbackActive`、readiness degradation を発火しない。Workout は Runtime Data として accept され、sets/reps/weight/count aggregate の対象に残る。

## Recovery Contract

Recovery endpoints are purpose-specific and do not expose Raw JSON write, arbitrary path write, generic Git operations, credential material, automatic merge, force push, or bulk recovery.

Current v2.1.0 public shape is shared by Windows AF, Android AF, Node development runtime, shared frontend client, and Maintenance UI:

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

Windows provides Recovery Git commit when the configured GitHub write boundary is available. Android exposes the same endpoint set and read/draft/validate semantics, but must return truthful capability and `RECOVERY_UNAVAILABLE` for commit when the packaged runtime cannot safely perform the Recovery Git write boundary. Node development runtime mirrors the public shape for local development and must not fake commit success.
