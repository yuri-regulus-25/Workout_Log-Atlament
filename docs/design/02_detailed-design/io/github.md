# GitHub I/O 現行仕様

GitHub は native AF runtime における raw Workout Data と Master Data の external source である。

## Access Model

現行 native AF GitHub access は Workout Data fetch と Master Data read/write を持つ。Workout Log write と generic Git write は実装しない。

API は repository configuration を使用する。

- owner
- repository
- ref
- root path
- resource paths

Resource path は request 前に root path と combine される。

## Current Resources

現行 valid resource type:

- `WORKOUT`: directory, default `workouts/`
- `MACHINE_MASTER`: file, default `master/machines.json`
- `GYM_MASTER`: file, default `master/gyms.json`

## Fetch Behavior

Workout directory fetch は directory entry を traverse し、JSON / JSONL runtime file を保持する。

Master resource は file として fetch される。

GitHub error は以下のような AF error code へ map される。

- `GITHUB_UNAUTHORIZED`
- `GITHUB_FORBIDDEN`
- `GITHUB_RATE_LIMIT`
- `GITHUB_RESOURCE_NOT_FOUND`
- `GITHUB_CONNECTION_FAILED`
- `GITHUB_TIMEOUT`
- `GITHUB_SERVER_ERROR`

Android は現行 source で HTTP 429 を `GITHUB_RATE_LIMITED` へ map しており、Windows constant `GITHUB_RATE_LIMIT` と spelling が異なる。

## Master Write Behavior

Master write は GitHub Contents API のみに限定する。書き込み target は AF 内部 allowlist で固定し、configuration や request body から任意 path を受け取らない。

- `MACHINE_MASTER`: `master/machines.json`, commit message `Update machine master`
- `GYM_MASTER`: `master/gyms.json`, commit message `Update gym master`

Write sequence:

1. 対象 content を GET して current SHA を取得する。
2. Request の `expectedRevision` と current SHA を比較する。
3. 対象 document と相手側 Master document を合わせて whole-master validation する。
4. Runtime Data が参照中の Gym/Machine を logical delete しないことを確認する。
5. Fixed commit message、base64 content、current SHA、configured branch で PUT する。

Stale SHA は PUT せず `MASTER_WRITE_CONFLICT` を返す。GitHub PUT が 409 を返した場合も同じ code へ map する。PUT response に new SHA がない場合は `MASTER_WRITE_FAILED` とする。

Master write は Production Repository を直接触る integration test を前提にしない。Windows unit/integration tests は fake `HttpMessageHandler` で GitHub status、network error、timeout、ambiguous write response を再現する。
