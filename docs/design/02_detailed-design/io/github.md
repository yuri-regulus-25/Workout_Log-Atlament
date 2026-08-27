# GitHub I/O 現行仕様

GitHub は native AF runtime における raw Workout Data と Master Data の external source である。

## Access Model

現行 native AF GitHub access は read-only である。

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
- `EXERCISE_MASTER`: file, default `master/exercises.json`
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

## Write Behavior

現行 source は Workout Log、Master Data、configuration、frontend artifact 向けの GitHub write API を実装していない。
