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
| POST | `/shutdown` | Application shutdown request。 |

Legacy `/api/common/*` alias は現行 contract では公開しない。Unknown `/api/*` route は frontend HTML へ fall through せず、platform error response を返す。

## Status Data

Status は以下を含む。

- `version`
- `versions.applicationFramework`
- `versions.frontendFramework`
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
