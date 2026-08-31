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

- `MACHINE_MASTER`: `master/machines.json`
- `GYM_MASTER`: `master/gyms.json`

Write sequence:

1. Local Master snapshot の revision と request の `expectedRevision` を比較する。
2. Request content と相手側 Local Master document を合わせて whole-master validation する。
3. 対象 remote Master content metadata を GET して current SHA を確認する。
4. Remote SHA と Local Master snapshot revision が一致する場合だけ、fixed commit message、base64 content、current SHA、configured branch で PUT する。
5. PUT 成功後、new SHA を Local Master snapshot revision として採用し、Remote Workout data と confirmed Local Master documents から Local Runtime Data を rebuild する。

Local revision mismatch または remote revision mismatch は PUT せず sync-required/conflict response を返す。GitHub PUT が 409 を返した場合も conflict へ map する。PUT response に new SHA がない場合は `MASTER_WRITE_FAILED` とする。

Runtime Data が参照中の Gym/Machine の logical delete は Master write として許可する。参照側は次回 sync/runtime rebuild で unresolved warning として扱い、Workout Data file は書き換えない。Unresolved Master resolution も Master write として処理する。既存 record への解決は `source_ids` の追加、新規 record への解決は通常 Create flow であり、Workout Data file は GitHub に PUT しない。

Master write は Production Repository を直接触る integration test を前提にしない。Windows unit/integration tests は fake `HttpMessageHandler` で GitHub status、network error、timeout、ambiguous write response を再現する。
